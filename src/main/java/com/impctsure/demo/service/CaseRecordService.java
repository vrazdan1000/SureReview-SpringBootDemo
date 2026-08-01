package com.impctsure.demo.service;

import java.util.List;
import java.util.Optional;

import com.impctsure.demo.model.CaseRecord;
import com.impctsure.demo.repository.CaseRecordRepository;
import org.springframework.stereotype.Service;

@Service
public class CaseRecordService {
	
	private final CaseRecordRepository repo;
	
	public CaseRecordService(CaseRecordRepository repo) {
		this.repo = repo;
	}
	
	public List<CaseRecord> getAll() {
        return repo.findAll();
    }
	
	public CaseRecord add(CaseRecord record) {
		String caseId = record.getCaseId(); // record.getCaseId():getter from CaseRecord.java
		if(repo.existsById(caseId)){  // repo.existsById:JpaRepository method
			throw new IllegalArgumentException(
					"Case Id" + record.getCaseId() + " already exists!");
		}
		return repo.save(record);
	}
	
	public CaseRecord update(String caseId, CaseRecord incoming) {
		CaseRecord existing = repo.findById(caseId).
				orElseThrow(() -> new IllegalArgumentException("Case id" + caseId + " not found!"));
		
		existing.setName(incoming.getName());
        existing.setDocType(incoming.getDocType());
        existing.setDate(incoming.getDate());
        existing.setStatus(incoming.getStatus());
        existing.setRemarks(incoming.getRemarks());
		return repo.save(existing);
	}
	
	public void delete(String caseId) {
		if(!repo.existsById(caseId)) {
			throw new IllegalArgumentException("Case id "+ caseId + " does not exist!");
		}
		repo.deleteById(caseId);
	}
	
}
