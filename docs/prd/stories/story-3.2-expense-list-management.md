# Story 3.2: Expense List and Management

## Story Overview

**As a bill participant,**  
**I want to view and manage expenses in chronological order with full split details,**  
**so that I can track spending patterns and make corrections when needed.**

## Dependencies

- **Story 2.1**: Bill Creation and Management (bills exist)
- **Story 2.2**: Participant Addition (participants exist)
- **Story 3.1**: Expense Addition with Flexible Splits (expenses exist)

## Acceptance Criteria

### Core Expense Listing
1. **GET /api/bills/:id/expenses** returns paginated expense list with split summaries
2. **Chronological Order**: Expenses sorted by date (newest first) with secondary sort by creation time
3. **Rich Display**: Shows payer, amount, description, split type, and participant involvement
4. **User Context**: Visual indicators for expenses paid by user and amounts owed by user
5. **Performance**: Efficient pagination for bills with 1000+ expenses

### Expense Detail View
1. **GET /api/bills/:id/expenses/:expenseId** returns complete expense with all split details
2. **Full Split Breakdown**: Shows exact amount each participant owes with percentages/shares
3. **Audit Information**: Creation timestamp, creator, and modification history
4. **Related Data**: Links to any settlements that reference this expense

### Expense Modification
1. **PUT /api/bills/:id/expenses/:expenseId** allows expense updates within 24 hours
2. **DELETE /api/bills/:id/expenses/:expenseId** allows deletion within 24 hours
3. **Creator Only**: Only expense creator can modify/delete (with time restrictions)
4. **Balance Recalculation**: Automatic balance updates after any expense changes
5. **Audit Trail**: Complete history of all expense modifications

## Technical Specifications

### API Endpoints

#### List Expenses
```typescript
GET /api/bills/:billId/expenses
Query Parameters:
  ?page=1&limit=20          // Pagination
  ?sort=date&order=desc     // Sort: date, amount, description
  ?payer_id=string          // Filter by specific payer
  ?from_date=YYYY-MM-DD     // Date range filter
  ?to_date=YYYY-MM-DD
  ?involving_me=true        // Filter expenses involving current user

Response:
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": string,
        "payer_participant_id": string,
        "payer_name": string,
        "amount_cents": number,
        "description": string,
        "expense_date": string,
        "split_type": "equal" | "percentage" | "shares",
        "participant_count": number,
        "my_split_amount": number,     // Current user's portion
        "paid_by_me": boolean,
        "i_owe": boolean,
        "created_at": string,
        "can_edit": boolean,
        "can_delete": boolean
      }
    ],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "pages": number
    },
    "summary": {
      "total_expenses": number,
      "total_amount": number,
      "my_total_paid": number,
      "my_total_owed": number
    }
  }
}
```

#### Get Expense Details
```typescript
GET /api/bills/:billId/expenses/:expenseId

Response:
{
  "success": true,
  "data": {
    "id": string,
    "bill_id": string,
    "payer_participant_id": string,
    "payer_name": string,
    "amount_cents": number,
    "description": string,
    "expense_date": string,
    "split_type": string,
    "splits": [
      {
        "participant_id": string,
        "participant_name": string,
        "amount_cents": number,
        "percentage": number,
        "shares": number
      }
    ],
    "created_at": string,
    "updated_at": string,
    "created_by_user_id": string,
    "creator_name": string,
    "modification_history": [
      {
        "modified_at": string,
        "modified_by": string,
        "changes": object
      }
    ]
  }
}
```

### Frontend Components

#### Expense List Component
```typescript
const ExpenseList: React.FC<{ billId: string }> = ({ billId }) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    involving_me: false,
    payer_id: '',
    from_date: '',
    to_date: ''
  });
  
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', billId, filters],
    queryFn: () => fetchExpenses(billId, filters)
  });
  
  if (isLoading) return <ExpenseListSkeleton />;
  
  return (
    <div className="expense-list">
      <ExpenseFilters filters={filters} onFiltersChange={setFilters} />
      
      <div className="expenses">
        {expensesData?.expenses.map(expense => (
          <ExpenseCard 
            key={expense.id} 
            expense={expense}
            onUpdate={() => queryClient.invalidateQueries(['expenses', billId])}
          />
        ))}
      </div>
      
      <Pagination 
        current={filters.page}
        total={expensesData?.pagination.pages}
        onPageChange={(page) => setFilters({...filters, page})}
      />
    </div>
  );
};
```

## Success Metrics

- ✅ Expense list loads within 2 seconds for bills with 500+ expenses
- ✅ Real-time updates when expenses are modified
- ✅ Accurate balance calculations after expense changes
- ✅ Edit/delete permissions enforced correctly with time limits

## Estimated Effort: 5 Story Points (4-5 hours)