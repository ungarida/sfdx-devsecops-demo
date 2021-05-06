public with sharing class CandidateGradeController {
    public CandidateGradeController() {   
    }
    
    @AuraEnabled
    public static CandidateGradeInfo getCandidateGrade(String contactId) { 
        
        // Build the query
        String selectQueryString = 'SELECT Name, Salary__c, NextAvailableDate__c FROM Contact where Id = \'' + contactId + '\'';
        Contact currentContact = Database.query(selectQueryString);
        
        // Build the test query 01
        String selectQueryString01 = 'SELECT Name, Salary__c, NextAvailableDate__c FROM Contact where Id = \'' + contactId + '\'';
        Contact currentContact01 = Database.query(selectQueryString01);

        User currentUser = [SELECT Seniority__c FROM User where Id = :UserInfo.getUserId()];
        String temperature = '';
        Double commission = 0;
        
        // set the temperature
        if (currentContact.Salary__c >= 5 && Date.today().daysBetween(currentContact.NextAvailableDate__c) < 90 ) {
            temperature = 'Hot';
        }
        else if (currentContact.Salary__c < 5 && Date.today().daysBetween(currentContact.NextAvailableDate__c) < 90 ) {
            temperature = 'Medium';
        }
        else {
            temperature = 'Cold';
        }

        Map<String, Double> seniorityCommissionMap = new Map<String, Double>();
        seniorityCommissionMap.put('Senior',0.15);
        seniorityCommissionMap.put('Medium',0.1);
        seniorityCommissionMap.put('Junior',0.05);

        if (seniorityCommissionMap.containsKey(currentUser.Seniority__c)) {
            commission = Double.valueOf(currentContact.Salary__c) * seniorityCommissionMap.get(currentUser.Seniority__c);
        }
        else {
            commission = Double.valueOf(currentContact.Salary__c) * 0.1;
        }

        return new CandidateGradeInfo(temperature, String.valueOf(commission));
    }

    public class CandidateGradeInfo {
        @AuraEnabled
        public String temperature {get;set;}

        @AuraEnabled
        public String commission {get;set;}

        public CandidateGradeInfo(String temperature, String commission) {
            this.temperature = temperature;
            this.commission = commission;
        }
    }
}
