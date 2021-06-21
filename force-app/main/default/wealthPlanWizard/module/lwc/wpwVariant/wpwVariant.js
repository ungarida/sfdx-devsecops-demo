/**
 * Created by naresh on 20/04/2020.
 */

import {api, LightningElement, wire} from 'lwc';
import {CHARTJS, LABELS, OBJECTS} from 'c/constants'
import {flowConfig, marketCapitalValue, saveRecordToDB, saveReport, showError, numberWithCommas} from 'c/wpUtil'

import getDeposits from "@salesforce/apex/DepositSelector.getDeposits";
import deleteVariant from "@salesforce/apex/WealthPlanSelector.deleteVariant";
import getSingleWealthPlanDetails from "@salesforce/apex/WealthPlanSelector.getSingleWealthPlanDetails";
import {getRecord} from 'lightning/uiRecordApi';
import {loadScript, loadStyle} from "lightning/platformResourceLoader";
import getFinancialPlanning from '@salesforce/apex/OPALHelper.financialPlanning';
import selectGoalsByWealthPlanIds from '@salesforce/apex/OPALHelper.getGoalsByWealthPlanId';
import updateWealthPlanWithOpalData from '@salesforce/apex/WealthPlanSelector.updateWealthPlanWithOpalData';
import {refreshApex} from '@salesforce/apex';
import {registerListener, unregisterListener} from "c/pubsub";
import currency from '@salesforce/i18n/currency';
import currencySymbol from '@salesforce/i18n/number.currencySymbol';

const INVESTMENT_ACCOUNT_FIELDS = [
    OBJECTS.INVESTMENT_ACCOUNT.FIELDS.VALUE
];
export default class WpwVariant extends LightningElement {
    currency = currency;
    currencySymbol = currencySymbol;
    m_wealthPlan;
    labels = LABELS;
    wealthPlanId;
    investmentAccountValue;
    monthlyDeposit;
    monthlyDepositRecordId;
    additionalDeposit;
    additionalDepositRecordId;
    investmentAccountId;
    isMaster;
    isLoading = false;
    initializedWealthPlan = false;

    portfolioName;

    financialPlanningData;
    goals;
    capitalGoalsComponent;
    capitalValueComponent;
    portfolioChartComponent;
    portfolioAllocationChartComponent;

    isChartExtLoaded = false;
    @api index;
    @api showDeleteButton;

    @api
    get wealthPlan() {
        return this.m_wealthPlan;
    }

    set wealthPlan(value) {
        //First get and show the values from the flow.
        this.m_wealthPlan = value;
        if (this.m_wealthPlan != null && this.m_wealthPlan.Id != null) {
            this.wealthPlanId = this.m_wealthPlan.Id;
        }
        if (this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.INVESTMENT_ACCOUNT.fieldApiName] != null) {
            this.investmentAccountId = this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.INVESTMENT_ACCOUNT.fieldApiName];
        }
        if (this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.IS_MASTER.fieldApiName] != null) {
            this.isMaster = this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.IS_MASTER.fieldApiName];
        }
        if (this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.PORTFOLIO_NAME.fieldApiName] != null) {
            this.portfolioName = this.m_wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.PORTFOLIO_NAME.fieldApiName];
        }

        if (this.m_wealthPlan != null &&
            this.m_wealthPlan.opalsf__Portfolio__r != null &&
            this.m_wealthPlan.opalsf__Portfolio__r.opalsf__Risk_Profile__r != null && this.portfolioChartComponent != null) {
            this.portfolioChartComponent.setRiskProfile(this.m_wealthPlan.opalsf__Portfolio__r.opalsf__Risk_Profile__r);
        }
        // Then refresh all info once.
        if (this.initializedWealthPlan == false) {
            this.refreshThisVariant();
            this.initializedWealthPlan = true;
        }
    }

    constructor() {
        super();
        registerListener('refreshvariantevent', this.refreshVariant, this);
    }

    disconnectedCallback() {
        unregisterListener('refreshvariantevent', this.refreshVariant, this);
    }

    refreshThisVariant() {
        this.refreshVariant({
            wealthPlanId: this.wealthPlanId
        })
    }

    refreshVariant(payload) {
        if (payload == null)
            return;
        if (payload.wealthPlanId == this.wealthPlanId) {
            this.isLoading = true;
            Promise.all([
                this.getWealthPlan(),
                this.getFinancialPlanningData(),
                refreshApex(this.deposits),
            ]).then((values) => {
                this.isLoading = false;
            }).catch(error => {
                this.isLoading = false;
                showError(this, error);
            });
        }
    }

    getWealthPlan() {
        return new Promise((resolve, reject) => {
            getSingleWealthPlanDetails({wealthPlanId: this.wealthPlanId})
                .then(result => {
                    this.wealthPlan = result;
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    get masterWealthPlanId(){
        if(this.wealthPlan != null){
            if(this.wealthPlan.opalsf__is_Master__c){
                return this.wealthPlan.Id;
            }else{
                return this.wealthPlan.opalsf__OPAL_Wealth_Plan_Master__c;
            }
        }
        return null;
    }

    get variantName() {
        return LABELS.Variant + ' ' + this.index;
    }

    get VA() {
        let va2 = LABELS.VA_Variant2=="NA"?null:LABELS.VA_Variant2;
        return this.isMaster?LABELS.VA_Starting_Situation:(this.index == 1 ? LABELS.VA_Variant1 : va2);
    }

    get VAResult() {
        let va2 = LABELS.VA_Compare_Result_Master=="NA"?null:LABELS.VA_Compare_Result_Master;

        return this.isMaster?LABELS.VA_Compare_Result_Master:(this.index == 1 ? LABELS.VA_Compare_Result_Variant1 : va2);
    }
    get VACapital() {
        let va2 = LABELS.VA_Capital_Development_Variant2=="NA"?null:LABELS.VA_Capital_Development_Variant2;
        return this.isMaster?LABELS.VA_Capital_Development_Master:(this.index == 1 ?
            (LABELS.VA_Capital_Development_Variant1 == "NA" ? null : LABELS.VA_Capital_Development_Variant1)  : va2);
    }

    rendered = false;

    renderedCallback() {
        this.capitalGoalsComponent = this.template.querySelector('c-wpw-capital-goal-feasibility');
        this.capitalValueComponent = this.template.querySelector('c-wpw-capital-value-development');
        this.portfolioChartComponent = this.template.querySelector('c-portfolio-chart');
        this.portfolioAllocationChartComponent = this.template.querySelector('c-portfolio-allocation-chart');

        this.loadScripts();

        if (this.rendered)
            refreshApex(this.deposits);
        this.rendered = true;
    }

    loadScripts() {
        let wpwController = this;
        if (this.isChartExtLoaded == false) {
            Promise.all([
                loadScript(this, CHARTJS.ZIP_CHARTJS),
                loadStyle(this, CHARTJS.ZIP_CHARTJSCSS)
            ])
                .then(() => {
                    Chart.platform.disableCSSInjection = true;
                    wpwController.isChartExtLoaded = true;
                })
                .catch(error => {
                    showError(this, error);
                });
        }
    }

    deposits;

    @wire(getDeposits, {wealthPlanId: '$wealthPlanId'})
    getDeposits(response) {
        this.deposits = response;
        if (response.data != null) {
            this.setAmount(response.data);
        }
        if (response.error) {
            showError(this, response.error);
        }
    }

    getFinancialPlanningData(event) {
        return new Promise((resolve, reject) => {
            let functionList = [
                selectGoalsByWealthPlanIds({wealthPlanId: this.wealthPlan.Id}),
                getFinancialPlanning({wealthPlanId: this.wealthPlan.Id})
            ];
            if (this.isMaster == false) {
                let masterId = this.wealthPlan[OBJECTS.WEALTHPLAN.FIELDS.Master_Wealth_Plan.fieldApiName];
                functionList.push(selectGoalsByWealthPlanIds({wealthPlanId: masterId}));
            }
            Promise.all(functionList).then((values) => {
                if (values != null) {
                    this.handleGoalDetailsResult(values[0]);
                    this.handleFinancialPlanningResult(values[1]);
                    this.handleMasterGoalsResult(values[2]);
                }
                resolve(values);
            }).catch(error => {
                reject(error);
            });
        });
    }

    handleMasterGoalsResult(result) {
        if (this.goals != null && result != null) {
            this.goals.maxSize = result.length;
        }
    }

    handleGoalDetailsResult(result) {
        this.goals = JSON.parse(JSON.stringify(result));
    }

    handleFinancialPlanningResult(result) {
        this.financialPlanningData = JSON.parse(result);

        let updatePayload = {
            wealthPlanId: this.wealthPlanId,
            capitalValueGoodMarket: marketCapitalValue(this.financialPlanningData, 'good'),
            capitalValueExpectedMarket: marketCapitalValue(this.financialPlanningData, 'expected'),
            capitalValueBadMarket: marketCapitalValue(this.financialPlanningData, 'poor'),
            shortTermRisk: this.shortTermRisk,
        };
        updateWealthPlanWithOpalData(updatePayload)
            .then(result => {
                //Good
            })
            .catch(error => {
                showError(this, error);
            });


    }

    get investmentReturn() {
        if (this.financialPlanningData != null &&
            this.financialPlanningData.items.assets != null &&
            this.financialPlanningData.items.assets[0].geometricAnnualReturns != null) {
            return this.financialPlanningData.items.assets[0].geometricAnnualReturns[3];
        }
    }

    get investmentReturnText() {
        if (this.investmentReturn == false) {
            return false;
        }
        return (this.investmentReturn * 100).toFixed(1) + ' %';
    }

    get investmentAccountActualValue() {
        if (this.investmentAccountValue != null) {
            return this.investmentAccountValue.value;
        }
    }

    get shortTermRisk() {
        if (this.financialPlanningData != null &&
            this.financialPlanningData.items.assets != null &&
            this.financialPlanningData.items.assets[0].potentialAnnualReturns != null) {
            return this.financialPlanningData.items.assets[0].potentialAnnualReturns[0];
        }
    }

    get shortTermRiskText() {
        if (this.shortTermRisk === false) {
            return;
        }
        return (this.shortTermRisk * 100).toFixed(1) + ' % ';
    }

    get shortTermRiskValue() {
        if (this.shortTermRisk === false || this.investmentAccountValue == null || this.additionalDeposit == null) {
            return;
        }
        return numberWithCommas((Math.abs((this.investmentAccountValue.value + this.additionalDeposit) * this.shortTermRisk)).toFixed(0));
    }

    get monthlyDepositText() {
        if (this.monthlyDeposit == null) {
            return;
        }
        return numberWithCommas((this.monthlyDeposit).toFixed(0));
    }

    get additionalDepositText() {
        if (this.additionalDeposit == null) {
            return;
        }
        return numberWithCommas((this.additionalDeposit).toFixed(0));
    }

    get investmentAccountActualValueText() {
        if (this.investmentAccountActualValue == null) {
            return;
        }
        return numberWithCommas((this.investmentAccountActualValue).toFixed(0));
    }


    /**
     * Set the monthly amount and additional amount values
     * @param data
     */
    setAmount(data) {
        if (data) {
            for (let record of data) {
                if (record != null && record.RecordType != null && record.RecordType.DeveloperName == 'Monthly') {
                    this.monthlyDeposit = record[OBJECTS.DEPOSIT.FIELDAPI.AMOUNT];
                    this.monthlyDepositRecordId = record.Id;
                } else if (record != null && record.RecordType != null && record.RecordType.DeveloperName == 'One_Time') {
                    this.additionalDeposit = record[OBJECTS.DEPOSIT.FIELDAPI.AMOUNT];
                    this.additionalDepositRecordId = record.Id;
                }
            }
        }
    }

    /**
     * Get the investment account actual amount
     * @param error
     * @param data - records data from controller
     */
    @wire(getRecord, {recordId: '$investmentAccountId', fields: INVESTMENT_ACCOUNT_FIELDS})
    getInvestmentAccount({error, data}) {
        if (data != null) {
            this.investmentAccountValue = data.fields[OBJECTS.INVESTMENT_ACCOUNT.FIELDS.VALUE.fieldApiName];
        } else {
            if (error != null) {
                showError(this, error);
            }
        }
    }

    handleRemoveVariant(event) {
        (async () => {
            let confirmDelete = await this.template.querySelector('c-confirm-dialog').showConfirmDialog();
            if (confirmDelete)
                this.removeVariant();
        })();
    }

    removeVariant() {
        this.isLoading = true;
        deleteVariant({variantId: this.m_wealthPlan.Id}).then(result => {
            if (true) {
                const deletedEvent = new CustomEvent('variantdeleted', {});
                this.dispatchEvent(deletedEvent);
                this.isLoading = false;
            }
        }).catch(error => {
            showError(this, error);
        });
    }

    handleSelectGoals(event) {
        let selectGoalComponent = this.template.querySelector("c-wpw-select-goals");
        selectGoalComponent.wealthPlan = this.m_wealthPlan;
        selectGoalComponent.openModal();
    }

    handleVaryOnRisk(event) {
        let varyOnRiskComponent = this.template.querySelector("c-wpw-vary-risk");
        varyOnRiskComponent.wealthPlan = this.m_wealthPlan;
        varyOnRiskComponent.openModal();
    }

    handleOptimizeDeposits(event) {
        let optimizeDepositComponent = this.template.querySelector("c-wpw-optimize-deposit");
        optimizeDepositComponent.wealthPlan = this.m_wealthPlan;
        optimizeDepositComponent.openModal();
    }

    handlePortfolioClicked(event) {
        let selectedIndex = event.detail.index;
        let selectedPortfolio = event.detail.portfolio;
        if (this.portfolioAllocationChartComponent != null) {
            this.portfolioAllocationChartComponent.setPortfolio(selectedPortfolio);
        }
    }

    adviceThisStrategy(event) {
        this.isLoading = true;

        let strategyName = LABELS.VariantName_Starting_Situation;
        if (!this.isMaster) {
            strategyName = this.variantName;
        }

        if (this.validateWealthPlanToAdvice()) {
            this.saveChartsInReport()
                .then(result => {
                    let eve = new CustomEvent('advicestrategy', {
                        detail: {
                            Id: this.m_wealthPlan.Id,
                            strategyName: strategyName
                        }
                    });
                    saveRecordToDB(this, this.m_wealthPlan.Id,
                        {[OBJECTS.WEALTHPLAN.FIELDAPI.STATUS]: 'Proposed'}).then(result => {
                        this.dispatchEvent(eve);
                        this.isLoading = false;
                    }).catch(error => {
                        showError(this, error);
                        this.isLoading = false;
                    });
                })
                .catch(error => {
                    // Handle error
                    showError(this, error);
                    this.isLoading = false;
                });
        } else {
            this.isLoading = false;
            showError(this, '', LABELS.ADVICE_CRITERIA_NOTMET)
        }
    }

    saveChartsInReport() {
        return new Promise((resolve, reject) => {
            let chartBase64Images = [];
            let names = [];

            let availablePortfolioChartBase64Image = this.portfolioChartComponent.availablePortfoliosChartBase64Image;
            let availablePortfolioChartIdentifier = this.portfolioChartComponent.availablePortfoliosChartIdentifier;
            if (availablePortfolioChartBase64Image != null && availablePortfolioChartIdentifier != null) {
                chartBase64Images.push(availablePortfolioChartBase64Image);
                names.push(availablePortfolioChartIdentifier);
            }
            let portfolioAllocationChartBase64Image = this.portfolioAllocationChartComponent.availablePortfoliosChartBase64Image;
            let portfolioAllocationChartIdentifier = this.portfolioAllocationChartComponent.availablePortfoliosChartIdentifier;
            if (portfolioAllocationChartBase64Image != null && portfolioAllocationChartIdentifier != null) {
                chartBase64Images.push(portfolioAllocationChartBase64Image);
                names.push(portfolioAllocationChartIdentifier);
            }

            let capitalValueChartBase64 = this.capitalValueComponent.capitalValueResultsChartBase64Image;
            let capitalValueResultsChartIdentifier = this.capitalValueComponent.capitalValueResultsChartIdentifier;
            if (capitalValueChartBase64 != null && capitalValueResultsChartIdentifier != null) {
                chartBase64Images.push(capitalValueChartBase64);
                names.push(capitalValueResultsChartIdentifier);
            }
            saveReport(this.wealthPlanId, chartBase64Images, names)
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    // Handle error
                    reject(error);
                });
        });

    }

    validateWealthPlanToAdvice() {
        let state = new flowConfig(this.wealthPlan);
        if (state.validate['AdviceStrategy'].isValid)
            return true
        else return false;
    }


}