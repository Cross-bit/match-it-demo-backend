

export interface Group {
    id: number
    groupUUID: string
    label: string
    creationTime?: Date
    membersUUIDs?: string[]
}