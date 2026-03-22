# Story 1.7: Database Constraint Optimization for Easier Deletion

## Story Overview

**As a developer,**  
**I want to optimize database relationship constraints to make deletion operations easier and more reliable,**  
**so that I can avoid foreign key constraint violations and improve test cleanup procedures.**

## Problem Statement

The current database schema has several foreign key constraints that make deletion operations complex and error-prone:

1. **Cascade Deletion Issues**: Some relationships use `onDelete: Cascade` while others don't, creating inconsistent behavior
2. **Circular Dependencies**: Complex relationships between User, Participant, and Bill entities create deletion order dependencies
3. **Test Cleanup Complexity**: Foreign key constraints make test data cleanup difficult and unreliable
4. **Data Integrity vs. Flexibility**: Current constraints prioritize data integrity but sacrifice operational flexibility

## Dependencies

- **Story 1.2**: Database Schema and Prisma Setup (current schema must exist)
- **Story 2.1**: Bill Creation and Management (bill-related constraints)
- **Story 2.2**: Participant Addition with Placeholder Support (participant-related constraints)

## Acceptance Criteria

### Constraint Optimization
1. **Consistent Cascade Behavior**: All related entities should have consistent `onDelete` behavior
2. **Simplified Deletion Order**: Remove circular dependencies that require specific deletion sequences
3. **Soft Delete Support**: Implement soft delete patterns where hard deletion is problematic
4. **Test-Friendly Schema**: Optimize schema for easier test data cleanup

### Specific Constraint Changes
1. **Participant Relationships**: 
   - Remove `onDelete: Cascade` from `BillMember.participant` relationship
   - Add soft delete support for participants with expense history
   - Allow orphaned participants to exist temporarily

2. **User-Participant Link**:
   - Make `UserParticipantLink` optional and nullable
   - Allow users to exist without participant records
   - Support participant record creation on-demand

3. **Bill Member Management**:
   - Allow bill members to be removed even with expense history (soft delete)
   - Implement proper cleanup procedures for removed members
   - Maintain referential integrity through application logic

4. **Expense and Settlement Constraints**:
   - Remove hard foreign key constraints on participant references
   - Use application-level validation for data integrity
   - Support historical data preservation

### Database Migration Strategy
1. **Backward Compatibility**: Ensure existing data remains intact during migration
2. **Gradual Rollout**: Implement changes in phases to minimize risk
3. **Rollback Plan**: Provide clear rollback procedures for each migration step
4. **Data Validation**: Verify data integrity after each migration step

## Technical Specifications

### Schema Changes

#### 1. Participant Model Updates
```prisma
model Participant {
  id          String   @id @default(uuid())
  displayName String?  @map("display_name")
  isDeleted   Boolean  @default(false) @map("is_deleted") // Soft delete
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime @default(now()) @map("created_at")

  // Remove onDelete: Cascade from relationships
  identifiers         ParticipantIdentifier[]
  billMembers         BillMember[]
  paidExpenses        Expense[]               @relation("ExpensePayer")
  expenseSplits       ExpenseSplit[]
  settlementsFrom     Settlement[]            @relation("SettlementFrom")
  settlementsTo       Settlement[]            @relation("SettlementTo")
  userLink            UserParticipantLink?

  @@map("participants")
}
```

#### 2. BillMember Model Updates
```prisma
model BillMember {
  id            String   @id @default(uuid())
  billId        String   @map("bill_id")
  participantId String   @map("participant_id")
  role          BillRole @default(MEMBER)
  isDeleted     Boolean  @default(false) @map("is_deleted") // Soft delete
  deletedAt     DateTime? @map("deleted_at")
  createdAt     DateTime @default(now()) @map("created_at")

  bill        Bill        @relation(fields: [billId], references: [id], onDelete: Cascade)
  participant Participant @relation(fields: [participantId], references: [id]) // Remove onDelete

  @@unique([billId, participantId])
  @@index([billId])
  @@index([participantId])
  @@map("bill_members")
}
```

#### 3. UserParticipantLink Model Updates
```prisma
model UserParticipantLink {
  participantId String @unique @map("participant_id")
  userId        String @unique @map("user_id")
  createdAt     DateTime @default(now()) @map("created_at")

  // Make relationships optional for easier deletion
  participant Participant @relation(fields: [participantId], references: [id], onDelete: SetNull)
  user        User        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@id([participantId, userId])
  @@map("users_participants_link")
}
```

### Application Logic Changes

#### 1. Soft Delete Implementation
```typescript
// Participant service with soft delete support
class ParticipantService {
  async softDeleteParticipant(participantId: string): Promise<void> {
    await this.prisma.participant.update({
      where: { id: participantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        // Clear user link to allow user deletion
        userLink: {
          delete: true
        }
      }
    });
  }

  async getActiveParticipants(billId: string): Promise<Participant[]> {
    return this.prisma.participant.findMany({
      where: {
        billMembers: {
          some: {
            billId,
            isDeleted: false
          }
        },
        isDeleted: false
      }
    });
  }
}
```

#### 2. Test Cleanup Optimization
```typescript
// Simplified test cleanup without foreign key constraints
class TestCleanupService {
  async cleanupTestData(): Promise<void> {
    // Delete in any order - no foreign key constraints to worry about
    await this.prisma.expenseSplit.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.expense.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.settlement.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.billMember.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.participantIdentifier.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.participant.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.userParticipantLink.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.identifier.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.user.deleteMany({ where: { /* test data filter */ } });
    await this.prisma.bill.deleteMany({ where: { /* test data filter */ } });
  }
}
```

### Migration Strategy

#### Phase 1: Add Soft Delete Fields
```sql
-- Add soft delete columns
ALTER TABLE participants ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE bill_members ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE bill_members ADD COLUMN deleted_at TIMESTAMP;

-- Add indexes for soft delete queries
CREATE INDEX idx_participants_is_deleted ON participants(is_deleted);
CREATE INDEX idx_bill_members_is_deleted ON bill_members(is_deleted);
```

#### Phase 2: Update Foreign Key Constraints
```sql
-- Remove problematic foreign key constraints
ALTER TABLE bill_members DROP CONSTRAINT IF EXISTS bill_members_participant_id_fkey;
ALTER TABLE users_participants_link DROP CONSTRAINT IF EXISTS users_participants_link_participant_id_fkey;
ALTER TABLE users_participants_link DROP CONSTRAINT IF EXISTS users_participants_link_user_id_fkey;

-- Add new constraints with SetNull behavior
ALTER TABLE users_participants_link 
  ADD CONSTRAINT users_participants_link_participant_id_fkey 
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL;

ALTER TABLE users_participants_link 
  ADD CONSTRAINT users_participants_link_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### Phase 3: Application Logic Updates
- Update all queries to filter by `isDeleted: false`
- Implement soft delete methods in services
- Update test cleanup procedures
- Add data integrity checks in application layer

## Implementation Plan

### Week 1: Schema Analysis and Planning
- [x] Analyze current constraint issues
- [x] Design new schema with soft delete support
- [x] Create migration scripts
- [x] Review with team

### Week 2: Database Migration
- [x] Implement Phase 1 migrations (add soft delete fields)
- [x] Test migrations on development environment
- [x] Implement Phase 2 migrations (update constraints)
- [x] Verify data integrity

### Week 3: Application Updates
- [x] Update Prisma schema
- [x] Implement soft delete logic in services
- [x] Update all queries to handle soft deletes
- [x] Update test cleanup procedures

### Week 4: Testing and Validation
- [x] Run comprehensive test suite
- [x] Performance testing with new constraints
- [x] Data integrity validation
- [x] Documentation updates

## Success Metrics

1. **Test Reliability**: 100% test pass rate with simplified cleanup
2. **Deletion Performance**: <100ms for participant removal operations
3. **Data Integrity**: Zero data corruption incidents
4. **Developer Experience**: Reduced complexity in test setup and cleanup

## Risks and Mitigation

### Risk: Data Integrity Issues
- **Mitigation**: Implement comprehensive application-level validation
- **Mitigation**: Add database triggers for critical integrity checks
- **Mitigation**: Extensive testing with production-like data

### Risk: Performance Impact
- **Mitigation**: Add proper indexes for soft delete queries
- **Mitigation**: Implement query optimization for filtered results
- **Mitigation**: Monitor query performance after deployment

### Risk: Migration Complexity
- **Mitigation**: Implement migrations in phases
- **Mitigation**: Maintain rollback procedures
- **Mitigation**: Test migrations on production-like data

## Future Considerations

1. **Audit Trail**: Implement comprehensive audit logging for all soft deletes
2. **Data Retention**: Add automated cleanup of old soft-deleted records
3. **Performance Monitoring**: Monitor query performance and optimize as needed
4. **Constraint Evolution**: Continue to refine constraints based on usage patterns

## Related Stories

- **Story 2.2**: Participant Addition with Placeholder Support (benefits from easier deletion)
- **Story 2.3**: Placeholder Claiming (simplified user-participant linking)
- **Story 3.1**: Expense Addition with Flexible Splits (easier member management)

## Definition of Done

- [x] All foreign key constraints optimized for easier deletion
- [x] Soft delete implementation complete and tested
- [x] Test cleanup procedures simplified and reliable
- [x] Migration scripts tested and documented
- [x] Application logic updated to handle new constraints
- [x] Performance benchmarks met
- [x] Documentation updated with new patterns
- [x] Team training completed on new deletion patterns
