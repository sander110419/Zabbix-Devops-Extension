import axios from 'axios';
import * as https from "https";
import * as tl from 'azure-pipelines-task-lib/task';

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
let maintenanceWindow: number;

if (typeof maintenanceWindowInput === 'string') {
    maintenanceWindow = parseInt(maintenanceWindowInput);
} else {
    console.error('maintenanceWindowInput is undefined');
    // Set a default value or return from the function
    maintenanceWindow = 0; // Default value
}

// Create a new HTTPS Agent with rejectUnauthorized set to false
const agent = new https.Agent({  
    rejectUnauthorized: false
  });

async function main() {
    if (typeof zabbixUrl !== 'string') {
        console.error('ZABBIX_URL is not defined');
        return; // Exit from the function
    }

    const authResponse = await axios.post(zabbixUrl, {
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

    const setWindow = await axios.post(zabbixUrl, {
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

    const logoutResponse = await axios.post(zabbixUrl, {
        jsonrpc: "2.0",
        method: "user.logout",
        params: {},
        id: 3,
        auth: zabbixAuthToken,
    }, { httpsAgent: agent });

    console.log(logoutResponse.data);
}

main().catch(console.error);