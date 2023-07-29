"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const https = __importStar(require("https"));
const tl = __importStar(require("azure-pipelines-task-lib/task"));
//get buidlID
let buildId = tl.getVariable('Build.BuildId');
//get AppID
let hostId = tl.getInput('HostID', true);
//Get pipeline name
let pipelineName = tl.getVariable('Build.DefinitionName');
//get zabbix URL
let zabbixUrl = tl.getInput('zabbixUrl', true);
//get zabbix user
let zabbixUsername = tl.getInput('zabbixvUsername', true);
//get zabbix password
let zabbixPassword = tl.getInput('zabbixPassword', true);
//get maintenance window
let maintenanceWindowInput = tl.getInput('maintenanceWindow', true);
let maintenanceWindow;
if (typeof maintenanceWindowInput === 'string') {
    maintenanceWindow = parseInt(maintenanceWindowInput);
}
else {
    console.error('maintenanceWindowInput is undefined');
    // Set a default value or return from the function
    maintenanceWindow = 0; // Default value
}
// Create a new HTTPS Agent with rejectUnauthorized set to false
const agent = new https.Agent({
    rejectUnauthorized: false
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const authResponse = yield axios_1.default.post(zabbixUrl, {
            jsonrpc: "2.0",
            method: "user.login",
            params: {
                user: zabbixUsername,
                password: zabbixPassword
            },
            id: 1
        }, { httpsAgent: agent });
        const zabbixAuthToken = authResponse.data.result;
        const epoch = Math.floor(Date.now() / 1000);
        const oneHour = epoch + (maintenanceWindow * 60);
        const setWindow = yield axios_1.default.post(zabbixUrl, {
            jsonrpc: "2.0",
            method: "maintenance.create",
            params: {
                name: "Devops initiated: " + pipelineName + " Build: #" + buildId,
                hosts: { "hostid": hostId },
                active_since: epoch.toString(),
                active_till: oneHour.toString(),
                tags_evaltype: "0",
                timeperiods: { "period": "3600", "timeperiod_type": "0", "start_date": epoch.toString() }
            },
            auth: zabbixAuthToken,
            id: 1
        }, { httpsAgent: agent });
        console.log(setWindow.data);
        const logoutResponse = yield axios_1.default.post(zabbixUrl, {
            jsonrpc: "2.0",
            method: "user.logout",
            params: {},
            id: 3,
            auth: zabbixAuthToken,
        }, { httpsAgent: agent });
        console.log(logoutResponse.data);
    });
}
main().catch(console.error);
