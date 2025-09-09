-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('PIX_CPF', 'PIX_CNPJ', 'PIX_EMAIL', 'PIX_PHONE', 'PIX_EVP', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "BillRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('EQUAL', 'PERCENT', 'SHARES');

-- CreateEnum
CREATE TYPE "SettlementMethod" AS ENUM ('PIX', 'CASH', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identifiers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_identifiers" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_participants_link" (
    "participant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_participants_link_pkey" PRIMARY KEY ("participant_id","user_id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "simplify_debts" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_members" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "role" "BillRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "payer_participant_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "description" TEXT,
    "spent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_splits" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "share_type" "ShareType" NOT NULL,
    "share_value" DECIMAL(10,4) NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "from_participant_id" TEXT NOT NULL,
    "to_participant_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "method" "SettlementMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_changelog" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_changelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identifiers_value_key" ON "identifiers"("value");

-- CreateIndex
CREATE INDEX "identifiers_user_id_idx" ON "identifiers"("user_id");

-- CreateIndex
CREATE INDEX "identifiers_value_idx" ON "identifiers"("value");

-- CreateIndex
CREATE UNIQUE INDEX "participant_identifiers_value_key" ON "participant_identifiers"("value");

-- CreateIndex
CREATE INDEX "participant_identifiers_participant_id_idx" ON "participant_identifiers"("participant_id");

-- CreateIndex
CREATE INDEX "participant_identifiers_value_idx" ON "participant_identifiers"("value");

-- CreateIndex
CREATE UNIQUE INDEX "users_participants_link_participant_id_key" ON "users_participants_link"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_participants_link_user_id_key" ON "users_participants_link"("user_id");

-- CreateIndex
CREATE INDEX "bills_owner_user_id_idx" ON "bills"("owner_user_id");

-- CreateIndex
CREATE INDEX "bill_members_bill_id_idx" ON "bill_members"("bill_id");

-- CreateIndex
CREATE INDEX "bill_members_participant_id_idx" ON "bill_members"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_members_bill_id_participant_id_key" ON "bill_members"("bill_id", "participant_id");

-- CreateIndex
CREATE INDEX "expenses_bill_id_idx" ON "expenses"("bill_id");

-- CreateIndex
CREATE INDEX "expenses_payer_participant_id_idx" ON "expenses"("payer_participant_id");

-- CreateIndex
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "expense_splits_participant_id_idx" ON "expense_splits"("participant_id");

-- CreateIndex
CREATE INDEX "settlements_bill_id_idx" ON "settlements"("bill_id");

-- CreateIndex
CREATE INDEX "settlements_from_participant_id_idx" ON "settlements"("from_participant_id");

-- CreateIndex
CREATE INDEX "settlements_to_participant_id_idx" ON "settlements"("to_participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "bill_changelog_bill_id_idx" ON "bill_changelog"("bill_id");

-- CreateIndex
CREATE INDEX "bill_changelog_user_id_idx" ON "bill_changelog"("user_id");

-- CreateIndex
CREATE INDEX "bill_changelog_created_at_idx" ON "bill_changelog"("created_at");

-- AddForeignKey
ALTER TABLE "identifiers" ADD CONSTRAINT "identifiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_identifiers" ADD CONSTRAINT "participant_identifiers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_participants_link" ADD CONSTRAINT "users_participants_link_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_participants_link" ADD CONSTRAINT "users_participants_link_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_members" ADD CONSTRAINT "bill_members_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_members" ADD CONSTRAINT "bill_members_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_participant_id_fkey" FOREIGN KEY ("payer_participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_participant_id_fkey" FOREIGN KEY ("from_participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_participant_id_fkey" FOREIGN KEY ("to_participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_changelog" ADD CONSTRAINT "bill_changelog_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_changelog" ADD CONSTRAINT "bill_changelog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
