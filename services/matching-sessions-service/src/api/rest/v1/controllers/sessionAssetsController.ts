import { Request, Response, NextFunction } from "express"
import logger from "../../../../logger";
import { SessionType } from "../../../../interface";
import { getCardsDataForSession } from "../../../../services/session/sessionCardsService";


export const getCardsPreviewController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { cardIds, sessionType } = req.query

        if (!cardIds || !sessionType) {
            return res.status(400).send({
                error: "cardId and sessionType query params are required"
            })
        }

        // parse cardId=42,555,14
        const cardIdsParsed = String(cardIds)
            .split(",")
            .map(id => Number(id))
            .filter(id => !isNaN(id))

        if (cardIdsParsed.length === 0) {
            return res.status(400).send({
                error: "cardId must contain at least one valid number"
            })
        }

        if (!Object.values(SessionType).includes(sessionType as SessionType)) {
            return res.status(400).send({
                error: `Invalid sessionType: ${sessionType}`
            })
        }

        const type = sessionType as SessionType

        logger.info("[CardsController] Fetching card previews", {
            cardIds,
            sessionType: type
        })

        const cardsData = await getCardsDataForSession(cardIdsParsed, type)

        res.status(200).send(cardsData)
    }
    catch (e) {
        next(e)
    }
}