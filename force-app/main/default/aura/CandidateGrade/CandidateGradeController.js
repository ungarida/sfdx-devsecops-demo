({
    doInit : function(cmp, event, helper) {
        
        var action = cmp.get("c.getCandidateGrade");
        action.setParams({ contactId : cmp.get("v.recordId") });

        // Create a callback that is executed after 
        // the server-side action returns
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {

                var candidateGradeInfo = response.getReturnValue();
                cmp.set("v.temperature", candidateGradeInfo.temperature);
                cmp.set("v.commission", candidateGradeInfo.commission);

                if (cmp.get("v.temperature") && cmp.get("v.commission")) {
                    cmp.set("v.displayGrade", true);
                }
            }
            else if (state === "INCOMPLETE") {
                // do something
            }
            else if (state === "ERROR") {
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        console.log("Error message: " + 
                                 errors[0].message);
                    }
                } else {
                    console.log("Unknown error");
                }
            }
        });

        $A.enqueueAction(action);
    }
})
