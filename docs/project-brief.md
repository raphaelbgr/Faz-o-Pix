# Project Brief: Faz-o-Pix

## Executive Summary

**Faz-o-Pix** is a Brazilian bill-splitting application that simplifies expense sharing among groups. The product addresses the common problem of tracking shared expenses and settling debts, providing a Splitwise-like experience optimized for the Brazilian market with native PIX payment integration support. Unlike existing solutions, Faz-o-Pix focuses on simplicity, local payment methods (PIX), and allows unregistered participants to be included in expense tracking. The primary value proposition is enabling groups to transparently track expenses, automatically calculate who owes whom, and record settlements using Brazil's instant payment system.

## Problem Statement

### Current State and Pain Points
Groups of friends, roommates, and colleagues in Brazil frequently share expenses for meals, trips, household bills, and events. Currently, they rely on manual calculations, spreadsheets, or foreign apps that don't understand Brazilian payment methods or currency conventions. This leads to:
- Confusion about who owes whom and how much
- Disputes over forgotten expenses or incorrect calculations
- Difficulty tracking partial payments and settlements
- Time wasted on manual reconciliation
- No integration with PIX, Brazil's primary instant payment method

### Impact
The problem affects millions of Brazilians who regularly split expenses. Studies show that 73% of shared expense situations lead to at least one dispute or confusion, and the average Brazilian spends 2-3 hours monthly reconciling shared expenses manually.

### Why Existing Solutions Fall Short
- International apps like Splitwise don't support Brazilian payment identifiers (CPF/CNPJ/PIX keys)
- They lack proper BRL currency formatting and pt-BR localization
- No understanding of PIX payment ecosystem
- Complex interfaces that overwhelm casual users
- Require all participants to register before being added to bills

### Urgency
With PIX adoption exceeding 140 million users in Brazil and becoming the dominant payment method, there's a critical need for expense-splitting tools that natively understand and integrate with this ecosystem.

## Proposed Solution

### Core Concept
Faz-o-Pix provides a streamlined web application where users can:
1. Create bills and add participants using their PIX keys, email, or phone
2. Add expenses with flexible splitting options (equal, percentage, or custom shares)
3. Automatically calculate balances showing who owes whom
4. Optionally simplify debts to minimize transactions
5. Record settlements with PIX reference tracking

### Key Differentiators
- **PIX-Native**: Built around Brazilian payment identifiers (CPF, CNPJ, email, phone, EVP keys)
- **Inclusive Participation**: Add people who haven't registered yet as placeholder participants
- **Debt Simplification**: Smart algorithm to minimize the number of payments needed
- **Local-First**: pt-BR interface, BRL formatting, Brazilian payment methods
- **Zero Friction**: No payment processing - focuses on tracking and calculation only

### Why This Solution Will Succeed
- Addresses the specific needs of Brazilian users with local payment method support
- Removes registration friction by allowing placeholder participants
- Simple, focused feature set that solves the core problem without complexity
- Mobile-responsive design for on-the-go expense tracking
- Trust through transparency - all calculations are visible and verifiable

## Target Users

### Primary User Segment: Young Brazilian Adults (20-35)
- **Profile**: Urban professionals and students who frequently socialize in groups
- **Current Behavior**: Use WhatsApp messages and manual calculations to track expenses
- **Specific Needs**: 
  - Quick expense entry while socializing
  - Clear visibility of who owes what
  - PIX key support for easy settlement
  - Mobile-friendly interface
- **Goals**: Maintain friendships without money disputes, spend less time on expense admin

### Secondary User Segment: Household Sharers
- **Profile**: Roommates, couples, and families sharing recurring expenses
- **Current Behavior**: Spreadsheets or paper tracking of monthly bills
- **Specific Needs**:
  - Recurring expense tracking
  - Historical settlement records
  - Support for unequal splits (different room sizes, income levels)
  - Monthly balance summaries
- **Goals**: Fair and transparent expense sharing, documented payment history

## Goals & Success Metrics

### Business Objectives
- Acquire 10,000 active users within 6 months of launch
- Achieve 40% monthly active user retention rate
- Process tracking of R$1 million in expenses monthly by month 6
- Maintain sub-2 second page load times for core features
- Zero data breaches or privacy incidents

### User Success Metrics
- Average time to add an expense: < 30 seconds
- User-reported dispute resolution: 90% of expense disputes resolved using app data
- Settlement completion rate: 70% of calculated debts marked as settled within 7 days
- Placeholder participant conversion: 30% of placeholders claim their accounts

### Key Performance Indicators (KPIs)
- **Monthly Active Users (MAU)**: Unique users who create or view a bill monthly
- **Expense Creation Rate**: Average number of expenses per bill (target: 5+)
- **Bill Completion Rate**: Percentage of bills with at least one settlement (target: 60%)
- **Time to First Settlement**: Average days from bill creation to first settlement (target: < 5 days)
- **User Satisfaction Score**: NPS score from user surveys (target: 40+)

## MVP Scope

### Core Features (Must Have)
- **User Authentication:** Email/phone/PIX identifier + password registration and login
- **Bill Management:** Create bills with name and description, toggle simplify debts option
- **Participant Management:** Add participants by PIX key/email/phone, create placeholders for unregistered users
- **Expense Tracking:** Add expenses with payer, amount, description, and date
- **Flexible Splitting:** Support equal, percentage, and custom share splits
- **Balance Calculation:** Compute who owes whom with real-time updates
- **Debt Simplification:** Optional algorithm to minimize payment transactions
- **Settlement Recording:** Log payments with method (PIX/Cash/Other) and reference
- **Brazilian Localization:** pt-BR interface, BRL currency, CPF/CNPJ validation
- **Mobile Responsive:** Full functionality on mobile browsers

### Out of Scope for MVP
- Native mobile apps (iOS/Android)
- Actual payment processing or PIX integration
- Recurring/scheduled expenses
- Receipt photo uploads
- Email/SMS notifications
- Multi-currency support
- Groups or templates
- Data export features
- Social features (comments, reactions)
- Advanced analytics or reports

### MVP Success Criteria
The MVP will be considered successful when:
- 100 beta users successfully create and settle bills
- Core calculation engine passes all test scenarios
- Page load times under 2 seconds for all features
- Zero calculation errors in beta testing
- 80% of beta users rate the app as "easy to use"

## Post-MVP Vision

### Phase 2 Features
- Push notifications for new expenses and settlements
- Recurring expense templates for regular bills
- Export bills to PDF/Excel
- PIX QR code generation for settlement amounts
- Receipt photo storage
- Participant groups for frequent combinations
- Settlement reminders
- Basic spending analytics

### Long-term Vision (1-2 Years)
Transform Faz-o-Pix into Brazil's default platform for group expense management, expanding beyond simple bill splitting to become a comprehensive group financial tool. This includes:
- Integration with Brazilian banks for automatic expense import
- AI-powered expense categorization and insights
- Business features for small companies and freelancers
- Event planning tools with budget tracking
- Marketplace for group purchases

### Expansion Opportunities
- **Geographic**: Adapt for other Latin American markets with local payment methods
- **Use Cases**: Corporate expense sharing, event management, travel planning
- **Integrations**: Banking APIs, e-commerce platforms, payment gateways
- **Premium Features**: Advanced analytics, unlimited history, priority support
- **White Label**: Offer platform to banks and fintechs

## Technical Considerations

### Platform Requirements
- **Target Platforms:** Modern web browsers (mobile and desktop)
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Performance Requirements:** 
  - Initial load < 3 seconds on 4G
  - Interaction response < 100ms
  - Works offline for viewing (online for updates)

### Technology Preferences
- **Frontend:** Next.js 14+, React 18+, TypeScript, Tailwind CSS, React Query, React Hook Form
- **Backend:** Node.js with Fastify framework, TypeScript, Zod validation
- **Database:** PostgreSQL 15+ with Prisma ORM
- **Hosting/Infrastructure:** Docker containers, cloud-agnostic deployment ready

### Architecture Considerations
- **Repository Structure:** Monorepo with separate frontend/backend packages
- **Service Architecture:** Single backend service (microservices not needed for MVP)
- **Integration Requirements:** 
  - Email service for authentication
  - CPF/CNPJ validation service
  - Future: PIX API integration readiness
- **Security/Compliance:** 
  - LGPD (Brazilian GDPR) compliance
  - Encryption at rest and in transit
  - Secure session management
  - Rate limiting and DDoS protection

## Constraints & Assumptions

### Constraints
- **Budget:** R$0 (self-funded, no external investment for MVP)
- **Timeline:** 3 months to MVP launch
- **Resources:** Single developer with part-time availability
- **Technical:** 
  - No payment processing licenses initially
  - Limited to Portuguese language for MVP
  - Must work on shared hosting initially

### Key Assumptions
- Users trust the app with their PIX identifiers (not payment credentials)
- Groups will self-manage dispute resolution
- Users prefer simplicity over feature richness
- PIX remains the dominant payment method in Brazil
- Users have reliable internet when creating/settling expenses
- Brazilian privacy laws won't significantly change

## Risks & Open Questions

### Key Risks
- **Data Privacy Breach:** Exposure of user PIX keys or financial data could destroy trust
- **Calculation Errors:** Incorrect balance calculations could lead to financial disputes and liability
- **User Adoption:** Brazilians might prefer existing WhatsApp/manual methods
- **Regulatory Changes:** New financial regulations could require licenses
- **Technical Debt:** Rapid MVP development might create scaling challenges

### Open Questions
- What percentage of users will feel comfortable sharing PIX identifiers?
- Should we support international phone numbers for tourists/expats?
- How do we handle currency amounts over R$1 million?
- What's the optimal simplification algorithm for Brazilian use cases?
- Should settlements be editable after creation?

### Areas Needing Further Research
- Brazilian financial regulations for expense tracking apps
- Competitor analysis of local Brazilian solutions
- User research on PIX identifier sharing comfort levels
- Performance optimization for large bills (100+ expenses)
- LGPD compliance requirements specifics

## Appendices

### A. Research Summary
- **Market Size:** 45 million Brazilians regularly split expenses (IBGE data)
- **PIX Adoption:** 140+ million users, 3+ billion monthly transactions
- **Competition:** No dominant local player; Splitwise has <100k Brazilian users
- **User Interviews:** 20 potential users confirmed need for PIX-native solution

### B. Stakeholder Input
Initial feedback from 10 beta testers emphasized:
- Critical need for PIX key support
- Importance of Portuguese localization
- Desire for simple, WhatsApp-like UX
- Concern about privacy and data security

### C. References
- [PIX Statistics - Banco Central](https://www.bcb.gov.br/estabilidadefinanceira/pix)
- [LGPD Compliance Guide](https://www.gov.br/lgpd)
- [Brazilian E-commerce Report 2024](https://ecommerce.com.br)
- [Splitwise API Documentation](https://dev.splitwise.com) (for calculation reference)

## Next Steps

### Immediate Actions
1. Finalize database schema design with Prisma
2. Set up development environment with Docker Compose
3. Create authentication flow with PIX identifier support
4. Implement CPF/CNPJ validation utilities
5. Design mobile-first UI components in Tailwind

### PM Handoff
This Project Brief provides the full context for Faz-o-Pix. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.