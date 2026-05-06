import { SessionData } from "./SessionsCachingService"
import { gateway as recommendationsGateway, IRecommendationGateway,
            SessionInfoMemberData,
            UserDeckVotingResults,
            NextRecItem,
        } from "../RecommendationServices/RecommendationSystemGateway"
import { MatchedItemDTO } from "../../api/ws/manager/ws.dto"
import logger from "../../logger";
import { SessionType } from "../../interface";

type sessionUUID = string;

interface SyncingSessionInfo {
    usersResults: UserDeckVotingResults[]
    matchedItemID: string | null
    recommendedItems: Record<string, NextRecItem<any>[]>
    session: SessionData
    matchingRun: number // currently fixed to 0, generally tracks the run of this matching (if users decides to run the matching again)
}

export interface MatchingResult<ActivityItemType> {
    matched: boolean,
    nextDeckOfCards: Record<string, ActivityItemType[]>,
    matchedItems: MatchedItemDTO[]
    matchedItemUUID: string
    sessionType: SessionType
}

export interface SingleItemVoteUpdateDTO {
    itemId: number,
    userUUID: string,
    sessionUUID: string,
    vote: number // -1, 0, 1
}

type RankedItem = {
    itemId: string
    voteSum: number
    avgRecScore: number
    finalScore: number
}

type MatchDecision = {
    hasMatch: boolean
    matchedItemId: string | null
    matchedItems: string[]
    rankedItems: RankedItem[]
}

/**
 * Checks if match occurred based on provided historical sessions data
 */
class SessionMatchingEngine {

    evaluate(
        pendingSessionInfo: SyncingSessionInfo,
        allInfosInSession: SyncingSessionInfo[]
    ): MatchDecision {

        // We prepare map of ItemId => to all the users that voted over this item across all the decks

        type ItemUserVotes = Map<string, Map<string, number>>; // map of itemId -> userUUID -> rating (meaning: all users that rated given item + that vote)
        const votes: ItemUserVotes = new Map()

        for (const history of allInfosInSession) {
            for (const userRes of history.usersResults) {

                // we go through all user votes and fill the votes map
                for (const vote of userRes.votingResult) {

                    if (!votes.has(vote.itemId)) {
                        votes.set(vote.itemId, new Map())
                    }

                    const perUser = votes.get(vote.itemId)!

                    // in weird case user rated same item twice ==> don't overwrite
                    if (!perUser.has(userRes.userUUID)) {
                        perUser.set(userRes.userUUID, vote.rating)
                    }
                }
            }
        }

        // 2. We pick only items rated by active members
        // we can't simply check just by the count of positive interactions, since the group size may have changed
        // (therefore a item that was never liked or even seen by any of the currently active members could win ==> we don't want this)
        const activeUserUUIDs = new Set(
            pendingSessionInfo.session.members.filter(m => m.isConnected).map(m => m.uuid)
        )

        const candidateItemIds: string[] = []

        for (const [itemId, perUserVotes] of votes) {
            let ok = true

            for (const activeUserUUID of activeUserUUIDs) {
                // item was not rated by all currently connected members => ignore
                if (!perUserVotes.has(activeUserUUID)) {
                    ok = false
                    break
                }
            }

            if (ok) { candidateItemIds.push(itemId) }
        }

        // 3. We prepare a map of scores for all the items and users that received them
        type ItemUserRecScores = Map<string, Map<string, number>> // itemId -> userUUID -> score from recommender (0..1)
        const recScores: ItemUserRecScores = new Map()

        for (const history of allInfosInSession) {
            const recommendedItems = history.recommendedItems ?? {}

            for (const [userUUID, recList] of Object.entries(recommendedItems)) {
                for (const rec of recList) {
                    const itemId = String(rec.itemId)

                    if (!recScores.has(itemId)) recScores.set(itemId, new Map())
                    const perUser = recScores.get(itemId)!

                    const prev = perUser.get(userUUID)

                    // if user had same item more times, we pick max
                    if (prev === undefined || rec.score > prev) {
                        perUser.set(userUUID, rec.score)
                    }
                }
            }
        }

        // 4. we perform the final ranking of the candidate items

        const maxNumberOfUsers = allInfosInSession.reduce(
            (max, info) => Math.max(max, info.session.members.length), 0)

        const ranked: RankedItem[] = []

        const ALPHA = 1        // votes sum weight
        const BETA = 0.5         // weight of the recommender score

        // we check all considerable items (all currently active members voted over them)
        for (const itemId of candidateItemIds) {
            const perUserVotes = votes.get(itemId)!          // userUUID -> rating
            const perUserRec = recScores.get(itemId)         // userUUID -> recScore (0..1)

            // we sum the votes of all the users who voted over given itemId
            let voteSum = 0
            for (const rating of perUserVotes.values()) {
                voteSum += rating
            }

            voteSum = voteSum/maxNumberOfUsers

            // avg recommender score (group rec score using mean aggregation)
            let avgRecScore = 0
            if (perUserRec && perUserRec.size > 0) {
                let s = 0
                for (const score of perUserRec.values()) {
                    s += score
                }
                avgRecScore = s / perUserRec.size
            }

            // final score
            const finalScore = ALPHA * voteSum + BETA * avgRecScore

            ranked.push({
                itemId,
                voteSum,
                avgRecScore,
                finalScore
            })
        }

        ranked.sort((a, b) => b.finalScore - a.finalScore)

        // 5. finally we check if we obtained at least one match

        const matchedItemIds: string[] = [] // all matched items == all items that currently active users voted positively

        for (const item of ranked) {
            const perUserVotes = votes.get(item.itemId)!
            let isMatch = true

            // all currently active users gave same item 1
            for (const activeUserUUID of activeUserUUIDs) {
                if (perUserVotes.get(activeUserUUID) !== 1) {
                    isMatch = false // otherwise it is not a match
                    break
                }
            }

            if (isMatch) {
                matchedItemIds.push(item.itemId)
            }
        }

        return {
            hasMatch: matchedItemIds.length > 0,
            matchedItemId: matchedItemIds.length > 0 ? matchedItemIds[0] : null,
            matchedItems: matchedItemIds,
            rankedItems: ranked
        } satisfies MatchDecision
    }
}


/**
 * Synchronizes all the users for new content from the group recommendation system.
 * Evaluates users votes (=> determines if session ended).
 */
class MatchingSessionCoordinator
{
    allHistorySesInfos: Map<sessionUUID, SyncingSessionInfo[]>;
    pendingSessions: Map<sessionUUID, SyncingSessionInfo>;

    recommendationGateway: IRecommendationGateway

    constructor(recommendationGateway: IRecommendationGateway) {
        this.allHistorySesInfos = new Map();
        //this.allVotedItemsInSession = new Map();

        this.pendingSessions = new Map();
        this.recommendationGateway = recommendationGateway;
    }

    /**
     * Return next session data for given user once all the group members voted.
     *
     * @param votingResult
     * @param currentSessionData
     * @returns
     */
    public getNextUserSessionData = async <CardT>(votingResult: UserDeckVotingResults, currentSessionData: SessionData) : Promise<MatchingResult<CardT> | null> => {

        let syncInfo: SyncingSessionInfo|undefined = this.pendingSessions.get(currentSessionData.uuid);

        if (!syncInfo) {
            syncInfo = this.addNewWaitingSession(currentSessionData);
        }

        logger.info(`user uuid ${votingResult.userUUID} received voting result len ${votingResult.votingResult.length}`)

        // update new user results
        syncInfo.usersResults.push(votingResult);

        logger.info(`[SESSION CONTENT SERVICE]: Clients waiting to get content count ${syncInfo.usersResults.length}`);

        if (!this.allClientsFinishedMatching(syncInfo.session.uuid))
            return null

        logger.info("here going to check match ")
        // called only once all the members finished their deck
        return this.resolveNextSessionState(syncInfo, currentSessionData)
    }


    /**
     * Clears all the syncing session data.
     *
     * @param sessionUUID
     */
    public clearAllSessionData = (sessionUUID: string) => {
        this.removeWaitingSession(sessionUUID) // remove data of currently synchronizing deck
        this.removeHistoricalSessionData(sessionUUID) // remove all the votes from the session
    }

    private async resolveNextSessionState<CardT>(
        syncInfo: SyncingSessionInfo,
        currentSessionData: SessionData
    ) : Promise<MatchingResult<CardT>>
    {

        let resultOfLastMatching: MatchingResult<CardT> | null =  null;


        const matchingRes = await this.checkMatchingResult(syncInfo.session.uuid)
        const mappedDTOs = await this.getMatchResultDTO(matchingRes, syncInfo.session.uuid)

        syncInfo.matchedItemID = matchingRes.matchedItemId

        // We have a match
        if (syncInfo.matchedItemID) {
            resultOfLastMatching = {
                matched: true,
                matchedItemUUID: syncInfo.matchedItemID,
                matchedItems: mappedDTOs,
                nextDeckOfCards: Object.fromEntries(
                currentSessionData.members
                    .filter(m => m.isConnected)
                    .map(m => [m.uuid, []])
                ),
                sessionType: syncInfo.session.sessionType
            } satisfies MatchingResult<CardT>;
        }
        else {

            logger.info(`[SESSION CONTENT SERVICE]: Getting next deck of cards for session: ${currentSessionData.uuid}`);

            const nextRec: Record<string, NextRecItem<CardT>[]> =
            await this.recommendationGateway.requestNextData<CardT>({
                session: {
                    id: currentSessionData.id,
                    sessionUUID: currentSessionData.uuid,
                    sessionType: currentSessionData.sessionType,
                    sessionSize: currentSessionData.currentRealSize,
                    members: currentSessionData.members.filter(m => m.isConnected).
                    map(m => ({ userUUID: m.uuid, isCreator: m.isCreator, metadata: m.metadata ?? {} } as SessionInfoMemberData))
                },
                usersVotingResults: syncInfo?.usersResults ? syncInfo?.usersResults : []
            });

            // store recommended items into the session info record
            syncInfo.recommendedItems = nextRec

            logger.info("[SESSION CONTENT SERVICE]: Returning next deck of cards (user keys):", Object.keys(nextRec));

            // no match return next deck of cards
            const nextDeckOfCards: Record<string, CardT[]> = Object.fromEntries(
                Object.entries(nextRec).map(([userId, items]) => {
                    if (!Array.isArray(items)) {
                        logger.error(
                            `[SESSION CONTENT SERVICE]: expected array of rec items for user ${userId}, got ${typeof items}`
                        );
                        return [userId, []];
                    }
                    return [userId, items.map((i) => i.cardData)];
                })
            );

            resultOfLastMatching = {
                matched: false,
                matchedItemUUID: "",
                nextDeckOfCards,
                matchedItems: [], // always empty here
                sessionType: syncInfo.session.sessionType
            } satisfies MatchingResult<CardT>;
        }

        this.removeWaitingSession(syncInfo.session.uuid);

        return resultOfLastMatching;
    }

    public updateSingleSessionVote(updateSingleVote: SingleItemVoteUpdateDTO) {

    }

    private allClientsFinishedMatching(sessionUUID: string) : boolean {
        const sessionInfo = this.pendingSessions.get(sessionUUID) as SyncingSessionInfo;
        if (!sessionInfo) {
            logger.error(`Session info for session ${sessionUUID} not in waiting list!`);
            const err = new Error(
                `Invariant violated: session ${sessionUUID} not found in pendingSessions`
            );
            logger.error(err.message);
            throw err;
        }

        return sessionInfo.usersResults.length >= sessionInfo.session.currentRealSize;
    }

    private checkMatchingResult(sessionUUID: string) : MatchDecision {
        logger.info(`[SESSION CONTENT SERVICE]: CHECKING MATCHING RES pending session UUID ${sessionUUID}`);

        const pendingSessionInfo = this.pendingSessions.get(sessionUUID) as SyncingSessionInfo;
        const allInfosInSession = this.allHistorySesInfos.get(sessionUUID)

        if (!pendingSessionInfo) {
            const err = new Error(
                `Invariant violation: pendingSessionInfo missing for session ${sessionUUID}`
            );
            logger.error(err.message);
            throw err;
        }
        if (!allInfosInSession) {
            const err = new Error(
                `Invariant violation: history session info missing for session ${sessionUUID}`
            );
            logger.error(err.message);
            throw err;
        }

        const matchingEngine = new SessionMatchingEngine()

        return matchingEngine.evaluate(pendingSessionInfo, allInfosInSession)
    }

    private getMatchResultDTO(decision: MatchDecision, sessionUUID: string) : MatchedItemDTO[] {

        const pendingSessionInfo = this.pendingSessions.get(sessionUUID) as SyncingSessionInfo;
        const allInfosInSession = this.allHistorySesInfos.get(sessionUUID)

        if (!pendingSessionInfo) {
            const err = new Error(
                `Invariant violation: pendingSessionInfo missing for session ${sessionUUID}`
            );
            logger.error(err.message);
            throw err;
        }
        if (!allInfosInSession) {
            const err = new Error(
                `Invariant violation: history session info missing for session ${sessionUUID}`
            );
            logger.error(err.message);
            throw err;
        }

        const cardDataByItemId = new Map(allInfosInSession
                .flatMap(s => Object.values(s.recommendedItems ?? {}).flat())
                .map(r => [String(r.itemId), r.cardData])
            )


        return decision.rankedItems.map((item, index) =>
        ({
            itemId: Number(item.itemId),
            rank: index + 1,
            run: pendingSessionInfo.matchingRun,
            score: item.finalScore,
            cardData: cardDataByItemId.get(item.itemId)
        } satisfies MatchedItemDTO ))
    }

    private removeWaitingSession = (sessionUUID: string) => {
        this.pendingSessions.delete(sessionUUID);
    }

    private addNewWaitingSession = (session: SessionData) : SyncingSessionInfo => {
        logger.info("[SESSION CONTENT SERVICE]: ADDING NEW SESSION INFO");

        const sessionInfo = {
            recommendedItems: {},
            usersResults: [],
            matchedItemID: null,
            session: session,
            matchingRun: 0
        } as SyncingSessionInfo;

        this.pendingSessions.set(session.uuid, sessionInfo);

        this.updateHistorySessionData(session.uuid);

        logger.info("[SESSION CONTENT SERVICE]:", sessionInfo);

        return sessionInfo;
    }

    private updateHistorySessionData = (sessionUUID: string) => {
        const sesInfo = this.pendingSessions.get(sessionUUID);

        if (!sesInfo) return;

        const cachedData = this.allHistorySesInfos.get(sessionUUID) ?? [];
        cachedData.push(sesInfo);
        this.allHistorySesInfos.set(sessionUUID, cachedData);
    }

    private removeHistoricalSessionData = (sessionUUID: string) => {
        this.allHistorySesInfos.delete(sessionUUID);
    }
}

export const sessionContentService = new MatchingSessionCoordinator(recommendationsGateway);
