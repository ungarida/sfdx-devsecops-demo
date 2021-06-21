import {updateRecord} from "lightning/uiRecordApi";
import {fireEvent} from "c/pubsub";
import {ShowToastEvent} from "lightning/platformShowToastEvent";

import {CHART_COLORS, CHARTJS, LABELS, OBJECTS, STAGESECTION, SECTION} from 'c/constants'

import {Config as flowConfig} from 'c/config';

import upsertReport from '@salesforce/apex/ReportSelector.upsertReport';
import getNumberOfDocumentGenerationTriggers
    from '@salesforce/apex/DocumentGenerationSelector.getNumberOfDocumentGenerationTriggers';

const updateWealthPlan = (instance, param) => {
    const updateEvent = new CustomEvent('wealthplanchange', {detail: param});
    instance.dispatchEvent(updateEvent);
}

/**
 * Get the current stage('Product') from brief string like "opalsf.WealthPlanWizardFlow:ProductStage'
 * @param stageFullVersion - fullversion fo the stage
 */
const getCurrentStage = (stageFullVersion) => {
    if (stageFullVersion) {
        let stage = stageFullVersion.split(":")[1];

        if (stage)
            return stage.substr(0, stage.indexOf("Stage"));
        else
            return null;
    } else
        return null;
}

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * When updating the wealthplan using 'updateRecord' uiRecordApi api. We will get different JSON structure from FLOW wealthplan structure.
 * Use the below method to construct JSON similar to FLOW wealthplan.
 */
const constructWealthPlan = (sqlData) => {
    if (sqlData) {
        let wealthPlan = {};
        let param = sqlData.fields;
        for (let key in param) {
            if (param.hasOwnProperty(key)) {
                wealthPlan[key] = param[key].value;
            }
        }
        param = sqlData;
        for (let key in param) {
            if (param.hasOwnProperty(key)) {
                wealthPlan[key] = param[key];
            }
        }
        wealthPlan['Id'] = param['id'];
        return wealthPlan;
    }
}

const saveInvestmentAccountToDB = (instance, param) => {
    saveRecordToDB(instance, instance.wealthPlan.Id, param)
        .then(result => {
            let newWealthPlan = constructWealthPlan(result);
            fireEvent(null, 'wealthPlanUpdatedForFooter', newWealthPlan);
        })
        .catch(error => {
            instance.dispatchEvent(
                new ShowToastEvent({
                    title: LABELS.Wizard_Error_Message,
                    message: error,
                    variant: 'error',
                }),
            );
        });
}


const saveWealthPlanToDB = (instance, param) => {
    saveRecordToDB(instance, instance.wealthPlan.Id, param)
        .then(result => {
            let newWealthPlan = constructWealthPlan(result);
            fireEvent(null, 'wealthPlanUpdatedForFooter', newWealthPlan);
        })
        .catch(error => {
            instance.dispatchEvent(
                new ShowToastEvent({
                    title: LABELS.Wizard_Error_Message,
                    message: error,
                    variant: 'error',
                }),
            );
        });
}
/**
 * Global util method to save record to SFDC using uiRecordApi api
 *
 */
const saveRecordToDB = (instance, recordId, fields) => {
    let record = {
        fields: {
            Id: recordId
        }
    };
    for (let key in fields) {
        if (fields.hasOwnProperty(key))
            record.fields[key] = fields[key];
    }
    return new Promise((resolve, reject) => {
        updateRecord(record)
            .then((data, error) => {
                if (data) {
                    resolve(data);
                } else {
                    reject(error);
                }

            })
            .catch(error => {
                reject(error);

            });
    });


}


/**
 * Show the toast notification message in flow header
 * @param instance - this
 * @param title
 * @param message
 * @param variant
 */
const showToastNotification = (instance, title, message, variant) => {
    const evt = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
    });
    instance.dispatchEvent(evt);
}

/**
 * Show the toast notification message in flow header
 * @param instance - this
 * @param message
 */
const showError = (instance, error, manualErrorMessage) => {
    let message = '';
    if (error != null && error.body != null && error.body.message != null) {
        message = error.body.message;
    }
    if (manualErrorMessage) message = manualErrorMessage;
    const evt = new ShowToastEvent({
        title: LABELS.Wizard_Error_Message,
        message: message,
        variant: 'Error',
    });
    instance.dispatchEvent(evt);
}
const saveReport = (wealthPlanId, chartBase64Images, names) => {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(chartBase64Images) || !Array.isArray(names) || chartBase64Images.length != names.length) {
            reject(LABELS.Error_Saving_WP_Report + LABELS.Error_Saving_WP_Report_Array_Length_Unequal);
        }
        let payload = {
            wealthPlanId: wealthPlanId,
            charts: []
        }
        chartBase64Images.forEach(function (chart, index) {
            let chartPayload = {
                base64String: chartBase64Images[index],
                name: names[index],
            }
            payload.charts.push(chartPayload);
        });
        let payloadString = JSON.stringify(payload);
        upsertReport({wrapperString: payloadString})
            .then(result => {
                resolve(result);
            })
            .catch(error => {
                reject(error);

            });
    });
}

const marketCapitalValue = (financialPlanningData, type) => {
    if (financialPlanningData == null || financialPlanningData.clients == null || financialPlanningData.clients[0] == null || financialPlanningData.clients[0].capital == null) {
        return 0;
    }
    var values = financialPlanningData.clients[0].capital.value;
    var horizonLength = financialPlanningData.general.yearMonthValues.length;
    if (type == 'good') {
        return values[values.length - 2][horizonLength - 1];
    }
    if (type == 'expected') {
        return values[(values.length - 1) / 2][horizonLength - 1];
    }
    if (type == 'poor') {
        return values[1][horizonLength - 1];
    }
}

const numberOfDocumentGenerationTriggers = () => {
    return new Promise((resolve, reject) => {
        getNumberOfDocumentGenerationTriggers({})
            .then(result => {
                resolve(result)
            })
            .catch(error => {
                reject(error);
            })
    });
}

const showSuccess = (instance, Message) => {

    const evt = new ShowToastEvent({
        title: LABELS.Message_Dialog_Header,
        message: Message,
        variant: 'success',
    });
    instance.dispatchEvent(evt);
}

const isInFirstSection = (stage) => {
    if (stage)
        return STAGESECTION.FIRST.includes(stage);
}

const isInSecondSection = (stage) => {
    if (stage)
        return STAGESECTION.SECOND.includes(stage);
}

const isInWhichSection = (stage) => {
    if (stage)
        if (STAGESECTION.FIRST.includes(stage)) {
            return SECTION.FIRST;
        } else if (STAGESECTION.SECOND.includes(stage)) {
            return SECTION.SECOND;
        }
}
/**
 * Exporting constants,config from Util so that all the required utilities can be imported from this namespace
 */
export {
    updateWealthPlan, saveRecordToDB, getCurrentStage, constructWealthPlan, saveWealthPlanToDB, showError,
    flowConfig,
    LABELS,
    OBJECTS,
    CHARTJS,
    CHART_COLORS,
    showToastNotification, showSuccess, isInFirstSection,
    isInSecondSection, isInWhichSection,
    saveReport,
    marketCapitalValue,
    numberOfDocumentGenerationTriggers,
    numberWithCommas
};