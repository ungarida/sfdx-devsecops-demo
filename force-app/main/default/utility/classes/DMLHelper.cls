public inherited sharing class DMLHelper {
    public static void insertAsUser(sObject obj, List<Schema.SObjectField> fieldsToSet){
        insertAsUser(new List<sObject>{obj}, fieldsToSet);
    }
    public static void updateAsUser(sObject obj, List<Schema.SObjectField> fieldsToSet){
        updateAsUser(new List<sObject>{obj}, fieldsToSet);
    }
    public static void insertAsUser(List<sObject> obj, List<Schema.SObjectField> fieldsToSet)
    {
        if(obj.size() == 0)
            return;
        isCreateable(obj[0], fieldsToSet);
        Savepoint sp = Database.setSavepoint();
        try {	
            insert obj;	
        }	
        catch(exception ex)
        {	
            System.debug(ex.getMessage());
            Database.rollback(sp);	
            throw new DmlException(ex.getMessage());
        }
    }
    public static void updateAsUser(List<sObject> obj, List<Schema.SObjectField> fieldsToSet){
        if(obj.size() == 0)
            return;
        isUpdateable(obj[0], fieldsToSet);

        Savepoint sp = Database.setSavepoint();
        try {	
            update obj;	
        }	
        catch(exception ex)
        {	
            System.debug(ex.getMessage());
            Database.rollback(sp);	
            throw new DmlException(ex.getMessage());
        } 
    }
    public static void deleteAsUser(sObject obj){
        deleteAsUser(new List<sObject>{obj});
    }
    public static void deleteAsUser(List<sObject> obj)
    {
        if(obj.size() == 0)
            return;
        isDeletable(obj[0].getSObjectType());
        Savepoint sp = Database.setSavepoint();
        try {
            Database.Delete(obj);
        }
        catch(exception ex)
        {
            System.debug(ex.getMessage());
            Database.rollback(sp);
            throw new DmlException(ex.getMessage());
        }
    }

    public static void isUpdateable(sObject obj, List<Schema.SObjectField> fieldsToSet)
    {
        isUpdateable(obj.getSObjectType(), fieldNames(fieldsToSet));
    }
    public static void isUpdateable(String objectName, List<String> fields) {
        SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        isUpdateable(sObjectType, fields);
    }
    public static void isUpdateable(SObjectType sObjectType, List<String> fields) {
        Boolean objectCheck = sObjectType.getDescribe().isUpdateable();
        if (objectCheck == false) throw new DmlException('Access denied to object ' + String.valueOf(sObjectType));

        Set<String> updateableFields = new Set<String>();

        for (SObjectField field : sObjectType.getDescribe().fields.getMap().values()) {
            if (field.getDescribe().isUpdateable())
                updateableFields.add(field.getDescribe().getName());
        }
        for (String f : fields ) {
            if (updateableFields.contains(f) == false) throw new DmlException('Access denied to update field ' + f + ' on object ' + String.valueOf(sObjectType));
        }
    }
    public static void isAccessible(sObject obj, List<Schema.SObjectField> fieldsToSet)
    {
        isAccessible(obj.getSObjectType(), fieldNames(fieldsToSet));
    }
    public static void isAccessible(String objectName, List<String> fields) {
        SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        isAccessible(sObjectType, fields);
    }
    public static void isAccessible(SObjectType sObjectType, List<String> fields) {
        Boolean objectCheck = sObjectType.getDescribe().isAccessible();
        if (objectCheck == false) throw new DmlException('Access denied to object ' + String.valueOf(sObjectType));

        Set<String> updateableFields = new Set<String>();

        for (SObjectField field : sObjectType.getDescribe().fields.getMap().values()) {
            if (field.getDescribe().isAccessible())
                updateableFields.add(field.getDescribe().getName());
        }
        for (String f : fields ) {
            if (updateableFields.contains(f) == false) throw new DmlException('Access denied to access field ' + f + ' on object ' + String.valueOf(sObjectType));
        }
    }
    private static List<String> fieldNames(List<Schema.SObjectField> fieldsToSet){
        List<String> response = new List<String>();
        for (Schema.SObjectField f: fieldsToSet) {
            response.add(String.valueOf(f));
        }
        return response;
    }
    public static void isCreateable(sObject obj, List<Schema.SObjectField> fieldsToSet)
    {
        isCreateable(obj.getSObjectType(), fieldNames(fieldsToSet));
    }
    public static void isCreateable(String objectName, List<String> fields) {
        SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        isCreateable(sObjectType,fields);
    }
    public static void isCreateable(SObjectType sObjectType, List<String> fields) {
        Boolean objectCheck = sObjectType.getDescribe().isCreateable();
        if (objectCheck == false) throw new DmlException('Access denied to object ' + String.valueOf(sObjectType));

        Set<String> updateableFields = new Set<String>();

        for (SObjectField field : sObjectType.getDescribe().fields.getMap().values()) {
            if (field.getDescribe().isCreateable())
                updateableFields.add(field.getDescribe().getName());
        }
        for (String f : fields ) {
            if (updateableFields.contains(f) == false) throw new DmlException('Access denied to create field ' + f + ' on object ' + String.valueOf(sObjectType));
        }
    }
    public static void isDeletable(SObjectType sObjectType) {
        Boolean objectCheck = sObjectType.getDescribe().isDeletable();
        if (objectCheck == false) throw new DmlException('Access denied to delete object ' + String.valueOf(sObjectType));
    }
}
