"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionstate = exports.sessiontype = exports.relationshiptype = exports.userauthenticationmethod = exports.userprivilegelevel = void 0;
var userprivilegelevel;
(function (userprivilegelevel) {
    userprivilegelevel["NORMAL"] = "NORMAL";
    userprivilegelevel["ADMIN"] = "ADMIN";
    userprivilegelevel["TESTER"] = "TESTER";
})(userprivilegelevel || (exports.userprivilegelevel = userprivilegelevel = {}));
;
var userauthenticationmethod;
(function (userauthenticationmethod) {
    userauthenticationmethod["DEVICE"] = "DEVICE";
    userauthenticationmethod["CREDENTIALS"] = "CREDENTIALS";
    userauthenticationmethod["GOOGLE"] = "GOOGLE";
})(userauthenticationmethod || (exports.userauthenticationmethod = userauthenticationmethod = {}));
;
var relationshiptype;
(function (relationshiptype) {
    relationshiptype["RELATIONSHIP"] = "RELATIONSHIP";
    relationshiptype["FAMILY"] = "FAMILY";
    relationshiptype["GOOGLE"] = "GOOGLE";
})(relationshiptype || (exports.relationshiptype = relationshiptype = {}));
;
var sessiontype;
(function (sessiontype) {
    sessiontype["CUISINE"] = "CUISINE";
    sessiontype["MOVIE"] = "MOVIE";
    sessiontype["SPORT"] = "SPORT";
    sessiontype["RESTAURANT"] = "RESTAURANT";
    sessiontype["BOARDGAME"] = "BOARDGAME";
    sessiontype["EVENT"] = "EVENT";
})(sessiontype || (exports.sessiontype = sessiontype = {}));
;
var sessionstate;
(function (sessionstate) {
    sessionstate["CREATED"] = "CREATED";
    sessionstate["INVITING"] = "INVITING";
    sessionstate["RUNNING"] = "RUNNING";
    sessionstate["MATCHED"] = "MATCHED";
    sessionstate["BROKEN"] = "BROKEN";
})(sessionstate || (exports.sessionstate = sessionstate = {}));
;
