import { GroupData } from "../../database/pg/types/group.db.types";
import { createNewGroup, tryGetGroupByUserUUIDs } from "../../database/usersDatabase"
import { NameGeneratorFactory, NameGeneratorType } from "./groupNameGenerator";
import { Group } from "./types";


/**
 * For given set of users makes sure that group info object exists.
 * @param usersUUIDs
 * @returns
 */
export const ensureGroupExists = async (usersUUIDs: string[]): Promise<Group | null> => {

    let groupData = await tryGetGroupByUserUUIDs(usersUUIDs)

    if (groupData == null){
        const dummyGroupLabel = NameGeneratorFactory
            .create(NameGeneratorType.GROUP_READABLE)
            .generate();

        groupData = await createNewGroup(usersUUIDs, dummyGroupLabel)
    }

    if (!groupData) return null;

    return {
        id: groupData.id,
        groupUUID: groupData?.group_uuid,
        label: groupData?.label ?? "",
        creationTime: groupData?.creation_time,
        membersUUIDs: usersUUIDs
    } satisfies Group;
}