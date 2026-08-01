package com.impctsure.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "case_records")
public class CaseRecord {

    @Id
    private String caseId;   // frontend generates this; no @GeneratedValue

    private String name;
    private String docType;
    private String date;
    private String status;
    private String remarks;	

    public String getCaseId() { return caseId; }
    public void setCaseId(String caseId) { this.caseId = caseId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}