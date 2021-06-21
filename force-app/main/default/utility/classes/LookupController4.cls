
public with sharing class LookupController3 {
    @AuraEnabled
    public static List<SObject> findRecords(
            String searchField, String searchValue, String objectName,
            String parentField, String parentValue,
            String orderByField, String orderDirection
    ){
        DMLHelper.isAccessible(objectName, new List<String>{searchField});


        String selectClause = 'SELECT ' + searchField;
        String fromClause = ' FROM ' + objectName;
        String whereClause = ' WHERE ' + searchField + ' LIKE ' + '\'%' + searchValue + '%\' ';
        String orderClause = '';
        if(parentField != null){
            DMLHelper.isAccessible(objectName, new List<String>{parentField});
            whereClause += 'AND ' + parentField + '=' + '\'' + parentValue + '\' ';
        }
        if(orderByField != null){
            DMLHelper.isAccessible(objectName, new List<String>{orderByField});
            if(orderDirection != 'ASC' && orderDirection != 'DESC') throw new OpalException(Label.Error_Invalid_Input); //Only allow ASC/DESC
            orderClause = ' ORDER BY ' + orderByField + ' ' + orderDirection;
        }

        String queryString = String.escapeSingleQuotes(selectClause + fromClause + whereClause + orderClause);
        List<SObject> sObjectList = Database.query(queryString);
        return sObjectList;
    }

}