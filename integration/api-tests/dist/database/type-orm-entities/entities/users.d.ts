import * as types from './custom_enums';
export declare class Users {
    id: number;
    uuid: string;
    name: string;
    email: string;
    access_rights: types.userprivilegelevel;
    authentication_method: types.userauthenticationmethod;
}
