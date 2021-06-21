/**
 * Created by Hugo on 24/03/2020.
 */

import {api, LightningElement} from 'lwc';
import findRecords from '@salesforce/apex/LookupController.findRecords';

import New from '@salesforce/label/c.New';

export default class LightningInputLookup extends LightningElement {

    /*all custom labels*/
    labels={
        New
    }

    /* The records returned in the search */
    records;

    /* Contains any errors */
    error;

    /* The selected record */
    selectedRecord;

    /* The value currently in the input field */
    searchValue;

    /* Icon Properties */
    get iconURL(){
        var iconProperties = this.iconName.split(":");
        return "/_slds/icons/"+ iconProperties[0] + "-sprite/svg/symbols.svg?cache=9.31.2-1#"+ iconProperties[0];
    }

    /* Should we show the dropdown? */
    get showDropdown(){
        if( this.hasResults || (this.searchValue != null && this.searchValue.length > 0)){
            return true;
        }
        return false;
    }
    get hasResults(){
        return this.records != null && this.records.length > 0;
    }

    @api
    setRecord(recordId, name){
        this.selectedRecord = { Id : recordId, Name : name };
    }

    @api index;
    @api iconName = 'standard:account';
    @api objectName = 'Account';
    @api searchField = 'Name';
    @api parentField;
    @api parentValue;
    @api allowNewRecord;
    @api disabled;

    handleOnChange(event){

        this.searchValue = event.detail;
        const valueChangedEvent = new CustomEvent(
            "valuechanged",{
                detail : {
                    value : this.searchValue,
                }
            }
        );
        this.dispatchEvent(valueChangedEvent);
        this.findRecordsFromDB();


    }
    handleOnBlur(event){

    }

    findRecordsFromDB(){
        /* Call the Salesforce Apex class method to find the Records */
        findRecords({
            searchValue :   this.searchValue,
            searchField :   this.searchField,
            objectName :    this.objectName,
            parentField :   this.parentField,
            parentValue :   this.parentValue,
            selectFields :  this.selectFields,
        })
            .then(result => {
                this.records = result;

            })
            .catch(error => {
                this.error = error;
                this.records = null;
            });
    }
    handleRemove(event){
        event.preventDefault();
        this.selectedRecord = undefined;
        this.records = undefined;
        this.error = undefined;
        /* fire the event with the value of undefined for the Selected RecordId */
        const selectedRecordEvent = new CustomEvent(
            "deselect",
            {
                detail : { recordId : undefined, index : this.index}
            }
        );
        this.dispatchEvent(selectedRecordEvent);
        this.findRecordsFromDB();
    }
    handleSelect(event){
        const selectedRecordId = event.detail;
        this.selectedRecord = this.records.find( record => record.Id === selectedRecordId);
        const selectedRecordEvent = new CustomEvent(
            "select",
            {
                //detail : selectedRecordId
                detail : {
                    recordId : this.selectedRecord.Id,
                    new : false
                }
            }
        );
        this.dispatchEvent(selectedRecordEvent);
    }
    handleSelectNew(event){
        this.searchValue = null;
        this.records = null;
        const selectedNewEvent = new CustomEvent(
            "select",
            {
                detail : {
                    record : null,
                    new : true
                }
            }
        );
        this.dispatchEvent(selectedNewEvent);
    }


}