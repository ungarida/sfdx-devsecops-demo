
public with sharing class LookupController2 {
    @AuraEnabled
    public static List<SObject> findRecords(
            String searchField, String searchValue, String objectName,
            String parentField, String parentValue,
            String orderByField, String orderDirection
    ){
        DMLHelper.isAccessible(objectName, new List<String>{searchField});


        String selectClause = 'SELECT ' + String.escapeSingleQuotes(searchField);
        String fromClause = ' FROM ' + objectName;
        String whereClause = ' WHERE ' + String.escapeSingleQuotes(searchField) + ' LIKE ' + '\'%' + String.escapeSingleQuotes(searchValue) + '%\' ';
        String orderClause = '';
        if(parentField != null){
            DMLHelper.isAccessible(objectName, new List<String>{parentField});
            whereClause += 'AND ' + String.escapeSingleQuotes(parentField) + '=' + '\'' + String.escapeSingleQuotes(parentValue) + '\' ';
        }
        if(orderByField != null){
            DMLHelper.isAccessible(objectName, new List<String>{orderByField});
            if(orderDirection != 'ASC' && orderDirection != 'DESC') throw new OpalException(Label.Error_Invalid_Input); //Only allow ASC/DESC
            orderClause = ' ORDER BY ' + String.escapeSingleQuotes(orderByField) + ' ' + String.escapeSingleQuotes(orderDirection);
        }

        String queryString = selectClause + fromClause + whereClause + orderClause;
        List<SObject> sObjectList = Database.query(queryString);
        return sObjectList;
    }

}