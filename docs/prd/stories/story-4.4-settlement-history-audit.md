# Story 4.4: Settlement History and Audit

## Story Overview

**As a bill participant,**  
**I want complete settlement history with PIX references and export capabilities,**  
**so that I can track all payments, resolve disputes, and maintain financial records.**

## Dependencies

- **Story 4.1**: Settlement Recording (settlements exist to display)
- **Story 4.2**: Debt Simplification Algorithm (settlement context)
- **Story 4.3**: Payment Suggestions UI (settlement creation integration)

## Acceptance Criteria

### Settlement History Display
1. **GET /api/bills/:id/settlements** returns paginated settlement history
2. **Chronological Timeline**: Settlements displayed in date order with visual timeline
3. **PIX Reference Display**: Show PIX transaction IDs for verification and dispute resolution
4. **Filter and Search**: Filter by participant, date range, method, or amount
5. **Export Functionality**: PDF and CSV export for accounting and legal purposes

### Audit Trail Features
1. **Immutable Records**: Settlements cannot be deleted, only marked as disputed
2. **Complete Metadata**: Creator, timestamp, IP address, and session information
3. **Dispute System**: Mark settlements as disputed with supporting evidence
4. **Verification Status**: Track settlement verification status (pending/confirmed/disputed)
5. **Legal Compliance**: Meet Brazilian financial record-keeping requirements

## Technical Specifications

### Settlement History API
```typescript
GET /api/bills/:billId/settlements
Query Parameters:
  ?page=1&limit=20
  ?participant_id=string          // Filter by payer or payee
  ?date_from=YYYY-MM-DD
  ?date_to=YYYY-MM-DD
  ?method=pix|bank_transfer|cash|other
  ?amount_min=number              // Minimum amount in cents
  ?amount_max=number              // Maximum amount in cents
  ?status=pending|confirmed|disputed

Response:
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": string,
        "payer_participant_id": string,
        "payer_name": string,
        "payee_participant_id": string,
        "payee_name": string,
        "amount_cents": number,
        "method": string,
        "pix_reference": string,
        "description": string,
        "settlement_date": string,
        "created_at": string,
        "created_by_user_id": string,
        "created_by_name": string,
        "verification_status": "pending" | "confirmed" | "disputed",
        "dispute_info": {
          "is_disputed": boolean,
          "disputed_at": string,
          "disputed_by": string,
          "dispute_reason": string
        }
      }
    ],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "pages": number
    },
    "summary": {
      "total_settlements": number,
      "total_amount_cents": number,
      "by_method": {
        "pix": { "count": number, "amount_cents": number },
        "bank_transfer": { "count": number, "amount_cents": number },
        "cash": { "count": number, "amount_cents": number },
        "other": { "count": number, "amount_cents": number }
      },
      "by_month": [
        {
          "month": string,        // YYYY-MM format
          "count": number,
          "amount_cents": number
        }
      ]
    }
  }
}
```

### Settlement Timeline Component
```typescript
const SettlementTimeline: React.FC<{ billId: string }> = ({ billId }) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    participant_id: '',
    date_from: '',
    date_to: '',
    method: '',
    status: ''
  });
  
  const { data: settlementsData, isLoading } = useQuery({
    queryKey: ['settlements', billId, filters],
    queryFn: () => fetchSettlements(billId, filters)
  });
  
  const exportSettlements = async (format: 'pdf' | 'csv') => {
    const response = await fetch(`/api/bills/${billId}/settlements/export?format=${format}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlements-${billId}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };
  
  if (isLoading) return <SettlementsTimelineSkeleton />;
  
  return (
    <div className="settlement-timeline">
      <div className="timeline-header">
        <h3>📅 Histórico de Pagamentos</h3>
        <div className="export-actions">
          <button onClick={() => exportSettlements('pdf')} className="export-btn">
            📄 Exportar PDF
          </button>
          <button onClick={() => exportSettlements('csv')} className="export-btn">
            📊 Exportar CSV
          </button>
        </div>
      </div>
      
      <SettlementFilters filters={filters} onFiltersChange={setFilters} />
      
      <div className="timeline">
        {settlementsData?.settlements.map((settlement, index) => (
          <SettlementTimelineItem
            key={settlement.id}
            settlement={settlement}
            isLast={index === settlementsData.settlements.length - 1}
          />
        ))}
      </div>
      
      {settlementsData?.settlements.length === 0 && (
        <div className="empty-timeline">
          <p>Nenhum pagamento registrado ainda.</p>
        </div>
      )}
      
      <Pagination
        current={filters.page}
        total={settlementsData?.pagination.pages}
        onPageChange={(page) => setFilters({...filters, page})}
      />
    </div>
  );
};
```

### Settlement Item Component
```typescript
const SettlementTimelineItem: React.FC<{
  settlement: Settlement;
  isLast: boolean;
}> = ({ settlement, isLast }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  
  const getMethodIcon = (method: string): string => {
    switch (method) {
      case 'pix': return '💳';
      case 'bank_transfer': return '🏦';
      case 'cash': return '💵';
      default: return '💰';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="status-badge confirmed">✅ Confirmado</span>;
      case 'disputed':
        return <span className="status-badge disputed">⚠️ Contestado</span>;
      default:
        return <span className="status-badge pending">⏳ Pendente</span>;
    }
  };
  
  return (
    <div className="timeline-item">
      <div className="timeline-marker">
        <div className="marker-dot" />
        {!isLast && <div className="marker-line" />}
      </div>
      
      <div className="timeline-content">
        <div className="settlement-card">
          <div className="settlement-header">
            <div className="settlement-info">
              <span className="method-icon">{getMethodIcon(settlement.method)}</span>
              <div className="participants">
                <span className="payer">{settlement.payer_name}</span>
                <span className="arrow">→</span>
                <span className="payee">{settlement.payee_name}</span>
              </div>
              <div className="amount">
                {formatCurrency(settlement.amount_cents)}
              </div>
            </div>
            
            <div className="settlement-meta">
              <time className="date">
                {formatDate(settlement.settlement_date, 'dd/MM/yyyy')}
              </time>
              {getStatusBadge(settlement.verification_status)}
            </div>
          </div>
          
          {settlement.description && (
            <div className="settlement-description">
              {settlement.description}
            </div>
          )}
          
          <div className="settlement-actions">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="action-btn secondary"
            >
              {showDetails ? '▼' : '▶'} Detalhes
            </button>
            
            {settlement.verification_status !== 'disputed' && (
              <button 
                onClick={() => setDisputeModalOpen(true)}
                className="action-btn warning"
              >
                ⚠️ Contestar
              </button>
            )}
            
            {settlement.pix_reference && (
              <button 
                onClick={() => copyToClipboard(settlement.pix_reference)}
                className="action-btn secondary"
              >
                📋 Copiar PIX
              </button>
            )}
          </div>
          
          {showDetails && (
            <div className="settlement-details">
              <div className="detail-row">
                <span className="label">Método:</span>
                <span className="value">{getMethodName(settlement.method)}</span>
              </div>
              
              {settlement.pix_reference && (
                <div className="detail-row">
                  <span className="label">Referência PIX:</span>
                  <span className="value pix-ref">{settlement.pix_reference}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="label">Registrado por:</span>
                <span className="value">{settlement.created_by_name}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Data de registro:</span>
                <span className="value">
                  {formatDateTime(settlement.created_at)}
                </span>
              </div>
              
              {settlement.dispute_info?.is_disputed && (
                <div className="dispute-info">
                  <h5>⚠️ Informações da Contestação</h5>
                  <div className="detail-row">
                    <span className="label">Contestado em:</span>
                    <span className="value">
                      {formatDateTime(settlement.dispute_info.disputed_at)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Contestado por:</span>
                    <span className="value">{settlement.dispute_info.disputed_by}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Motivo:</span>
                    <span className="value">{settlement.dispute_info.dispute_reason}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {disputeModalOpen && (
        <DisputeModal
          settlement={settlement}
          onClose={() => setDisputeModalOpen(false)}
          onDispute={(reason) => handleDispute(settlement.id, reason)}
        />
      )}
    </div>
  );
};
```

### Export Functionality
```typescript
// PDF Export using jsPDF with Brazilian formatting
const generateSettlementsPDF = async (billId: string, settlements: Settlement[]): Promise<Blob> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Histórico de Pagamentos', 20, 30);
  doc.setFontSize(12);
  doc.text(`Conta: ${billId}`, 20, 40);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50);
  
  // Settlement table
  const tableData = settlements.map(settlement => [
    formatDate(settlement.settlement_date, 'dd/MM/yyyy'),
    settlement.payer_name,
    settlement.payee_name,
    formatCurrency(settlement.amount_cents),
    getMethodName(settlement.method),
    settlement.pix_reference || '-',
    settlement.verification_status === 'confirmed' ? 'Sim' : 'Não'
  ]);
  
  const headers = [
    'Data', 'Pagador', 'Recebedor', 'Valor', 'Método', 'Referência PIX', 'Confirmado'
  ];
  
  // Using autoTable plugin for table formatting
  (doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: 60,
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [66, 139, 202]
    }
  });
  
  return doc.output('blob');
};

// CSV Export with Brazilian formatting
const generateSettlementsCSV = (settlements: Settlement[]): string => {
  const headers = [
    'Data',
    'Pagador',
    'Recebedor',
    'Valor',
    'Método',
    'Descrição',
    'Referência PIX',
    'Status',
    'Registrado em',
    'Registrado por'
  ];
  
  const rows = settlements.map(settlement => [
    formatDate(settlement.settlement_date, 'dd/MM/yyyy'),
    settlement.payer_name,
    settlement.payee_name,
    `"R$ ${(settlement.amount_cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}"`,
    getMethodName(settlement.method),
    `"${settlement.description || ''}"`,
    settlement.pix_reference || '',
    settlement.verification_status,
    formatDateTime(settlement.created_at),
    settlement.created_by_name
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
    
  // Add BOM for proper UTF-8 encoding in Excel
  return '\uFEFF' + csvContent;
};
```

### Dispute System
```typescript
const DisputeModal: React.FC<{
  settlement: Settlement;
  onClose: () => void;
  onDispute: (reason: string, evidence?: File[]) => void;
}> = ({ settlement, onClose, onDispute }) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [evidence, setEvidence] = useState<File[]>([]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDispute(disputeReason, evidence);
    onClose();
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} className="dispute-modal">
      <div className="modal-header">
        <h3>⚠️ Contestar Pagamento</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="modal-content">
        <div className="settlement-summary">
          <p>
            <strong>Pagamento:</strong> {settlement.payer_name} → {settlement.payee_name}
          </p>
          <p>
            <strong>Valor:</strong> {formatCurrency(settlement.amount_cents)}
          </p>
          <p>
            <strong>Data:</strong> {formatDate(settlement.settlement_date, 'dd/MM/yyyy')}
          </p>
        </div>
        
        <div className="form-group">
          <label htmlFor="dispute-reason" className="required">
            Motivo da Contestação
          </label>
          <select
            id="dispute-reason"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            required
            className="form-select"
          >
            <option value="">Selecione o motivo</option>
            <option value="payment_not_received">Pagamento não foi recebido</option>
            <option value="incorrect_amount">Valor incorreto</option>
            <option value="wrong_method">Método de pagamento incorreto</option>
            <option value="duplicate_payment">Pagamento duplicado</option>
            <option value="other">Outro motivo</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="evidence">
            Comprovantes (Opcional)
          </label>
          <input
            id="evidence"
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => setEvidence(Array.from(e.target.files || []))}
            className="form-input"
          />
          <small className="form-hint">
            Screenshots, comprovantes PIX, etc.
          </small>
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="button-secondary">
            Cancelar
          </button>
          <button type="submit" className="button-warning">
            Contestar Pagamento
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

## Success Metrics

- ✅ Settlement history loads within 2 seconds for bills with 500+ settlements
- ✅ PDF export generates successfully for datasets up to 1000 settlements
- ✅ CSV export maintains proper Brazilian formatting and encoding
- ✅ Dispute system provides clear audit trail for conflict resolution
- ✅ PIX reference storage and display enables 95% payment verification

## Estimated Effort: 8 Story Points (6-7 hours)

### Breakdown
- Settlement History API and Database: 2 hours
- Timeline UI Components: 2 hours
- Export Functionality (PDF/CSV): 1.5 hours
- Dispute System: 1.5 hours
- Testing and Polish: 1 hour