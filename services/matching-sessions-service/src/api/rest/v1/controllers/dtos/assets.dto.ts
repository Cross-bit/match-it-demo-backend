import { SessionType } from "../../../../../interface";


export interface CardsDataDTO<CardT> {
    sessionType: SessionType
    cards: CardT[]
}