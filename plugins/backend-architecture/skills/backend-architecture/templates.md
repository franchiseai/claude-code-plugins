# Architecture Refactor Templates

Extended reference templates for complete file implementations. Refer to these when generating new entity/service files.

## Complete Entity Example

```typescript
// {concept}Entity.ts
import { eq, and, inArray, desc } from "drizzle-orm";
import { drizzleSchema } from "@fsai/supabase";
import { database, isInTransaction } from "../../db/db.js";
import { generateUUID } from "../utils/crypto.js";
import type { Deal, DealOverview, DealSummary } from "@fsai/sdk";

class DealEntity {
  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS RULES (Predicates)
  //
  // Guidelines:
  // - Return boolean or { allowed: boolean; reason?: string }
  // - NEVER throw errors
  // - No side effects (no logging, no external calls)
  // - Use Pick<T, 'field'> to document required fields
  // - Testable in complete isolation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Determines if this is a deal created for an existing franchise entity
   * (as opposed to a deal created from an application/lead).
   */
  isEntityDeal(
    deal: Pick<DealOverview, "applicationId" | "franchiseeOrgId">
  ): boolean {
    return !deal.applicationId && Boolean(deal.franchiseeOrgId);
  }

  /**
   * Determines if this is a deal created from an application/lead.
   */
  isApplicationDeal(deal: Pick<DealOverview, "applicationId">): boolean {
    return Boolean(deal.applicationId);
  }

  /**
   * Checks if a deal can be converted to a franchisee organization.
   * Only application-based deals that haven't been converted can be converted.
   */
  canConvert(
    deal: Pick<
      DealOverview,
      "applicationId" | "convertedAt" | "franchiseeOrgId"
    >
  ): { allowed: boolean; reason?: string } {
    if (deal.convertedAt) {
      return { allowed: false, reason: "Deal has already been converted" };
    }

    if (this.isEntityDeal(deal)) {
      return {
        allowed: false,
        reason:
          "Entity-based deals cannot be converted (already linked to franchise entity)",
      };
    }

    if (!deal.applicationId) {
      return { allowed: false, reason: "Deal has no application to convert" };
    }

    return { allowed: true };
  }

  /**
   * Checks if a deal can have proposed locations.
   * Entity deals use real locations, not proposed ones.
   */
  canHaveProposedLocations(
    deal: Pick<DealOverview, "applicationId" | "franchiseeOrgId">
  ): boolean {
    return this.isApplicationDeal(deal);
  }

  /**
   * Checks if a deal can have additional applications (partners).
   * Entity deals don't have applications.
   */
  canHaveAdditionalApplications(
    deal: Pick<DealOverview, "applicationId" | "franchiseeOrgId">
  ): boolean {
    return this.isApplicationDeal(deal);
  }

  /**
   * Checks if a deal can have assigned territories.
   * Entity deals handle territories elsewhere.
   */
  canHaveTerritories(
    deal: Pick<DealOverview, "applicationId" | "franchiseeOrgId">
  ): boolean {
    return this.isApplicationDeal(deal);
  }

  /**
   * Checks if a deal can be deleted.
   */
  canDelete(deal: Pick<DealOverview, "convertedAt" | "status">): {
    allowed: boolean;
    reason?: string;
  } {
    if (deal.convertedAt) {
      return { allowed: false, reason: "Cannot delete converted deals" };
    }

    if (deal.status === "won") {
      return { allowed: false, reason: "Cannot delete won deals" };
    }

    return { allowed: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA ACCESS - Queries
  //
  // Guidelines:
  // - Return null for not found (don't throw NotFoundError usually)
  // - Handle all joins and include necessary relations
  // - Transform DB shape to domain shape
  // - Encapsulate table structure details
  // ═══════════════════════════════════════════════════════════════════════════

  async getById(dealId: string): Promise<Deal | null> {
    const data = await database.query.deals.findFirst({
      where: eq(drizzleSchema.deals.id, dealId),
    });

    return data ?? null;
  }

  async getOverview(dealId: string): Promise<DealOverview | null> {
    const data = await database.query.deals.findFirst({
      where: eq(drizzleSchema.deals.id, dealId),
      with: {
        dealsAgreementsFees: {
          with: {
            agreementFee: { columns: { name: true } },
          },
        },
        dealsLegalTermsConditions: {
          with: {
            legalTermsCondition: { columns: { name: true } },
          },
        },
        dealsProposedLocations: {
          with: {
            vendorTemplate: {
              columns: { id: true, name: true },
            },
          },
        },
        territories: {
          columns: {
            id: true,
            displayId: true,
            name: true,
            geometry: true,
            state: true,
          },
        },
      },
    });

    if (!data) return null;

    return this.mapToOverview(data);
  }

  async getByApplication(applicationId: string): Promise<string | null> {
    // Check if this application is the lead application
    const leadDeal = await database.query.deals.findFirst({
      where: eq(drizzleSchema.deals.applicationId, applicationId),
      columns: { id: true },
    });

    if (leadDeal) return leadDeal.id;

    // Check if this application is an additional application
    const additionalApp =
      await database.query.dealsAdditionalApplications.findFirst({
        where: eq(
          drizzleSchema.dealsAdditionalApplications.applicationId,
          applicationId
        ),
        columns: { dealId: true },
      });

    return additionalApp?.dealId ?? null;
  }

  async getByFranchiseeOrg(
    franchiseeOrgId: string,
    brandId: string
  ): Promise<string | null> {
    const data = await database.query.deals.findFirst({
      where: and(
        eq(drizzleSchema.deals.franchiseeOrgId, franchiseeOrgId),
        eq(drizzleSchema.deals.brandId, brandId)
      ),
      columns: { id: true },
    });

    return data?.id ?? null;
  }

  async getByBrand(brandId: string): Promise<DealSummary[]> {
    const data = await database.query.deals.findMany({
      where: eq(drizzleSchema.deals.brandId, brandId),
      columns: {
        id: true,
        displayId: true,
        brandId: true,
        createdAt: true,
        status: true,
      },
    });

    return data;
  }

  async exists(dealId: string): Promise<boolean> {
    const data = await database.query.deals.findFirst({
      where: eq(drizzleSchema.deals.id, dealId),
      columns: { id: true },
    });
    return Boolean(data);
  }

  async existsForFranchiseeOrg(
    franchiseeOrgId: string,
    brandId: string
  ): Promise<boolean> {
    const id = await this.getByFranchiseeOrg(franchiseeOrgId, brandId);
    return Boolean(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA ACCESS - Mutations
  //
  // Guidelines:
  // - Don't enforce business rules (service does that)
  // - Return created IDs
  // - Handle transaction awareness with isInTransaction()
  // ═══════════════════════════════════════════════════════════════════════════

  async create(params: {
    applicationId?: string;
    franchiseeOrgId?: string;
    brandId: string;
    visibleToApplicant?: boolean;
  }): Promise<string> {
    const displayId = await this.getNextDisplayId(params.brandId);

    const [data] = await database
      .insert(drizzleSchema.deals)
      .values({
        displayId,
        applicationId: params.applicationId ?? null,
        franchiseeOrgId: params.franchiseeOrgId ?? null,
        brandId: params.brandId,
        visibleToApplicant: params.visibleToApplicant ?? false,
        leadApplicationOwnershipPercentage: params.applicationId ? 100 : null,
      })
      .returning({ id: drizzleSchema.deals.id });

    if (!data) {
      throw new Error("Failed to create deal");
    }

    return data.id;
  }

  async update(
    dealId: string,
    updates: Partial<Omit<Deal, "id">>
  ): Promise<void> {
    await database
      .update(drizzleSchema.deals)
      .set(updates)
      .where(eq(drizzleSchema.deals.id, dealId));
  }

  async markConverted(dealId: string, franchiseeOrgId: string): Promise<void> {
    await database
      .update(drizzleSchema.deals)
      .set({
        convertedAt: new Date().toISOString(),
        franchiseeOrgId,
        status: "won",
      })
      .where(eq(drizzleSchema.deals.id, dealId));
  }

  async updateStatus(dealId: string, status: Deal["status"]): Promise<void> {
    await database
      .update(drizzleSchema.deals)
      .set({ status })
      .where(eq(drizzleSchema.deals.id, dealId));
  }

  async delete(dealId: string): Promise<void> {
    await database
      .delete(drizzleSchema.deals)
      .where(eq(drizzleSchema.deals.id, dealId));
  }

  async deleteMany(dealIds: string[]): Promise<void> {
    if (dealIds.length === 0) return;

    await database
      .delete(drizzleSchema.deals)
      .where(inArray(drizzleSchema.deals.id, dealIds));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-ENTITY ACCESS (for tightly coupled child data)
  // ═══════════════════════════════════════════════════════════════════════════

  async setProposedLocations(
    dealId: string,
    locations: ProposedLocationInput[]
  ): Promise<void> {
    const dataToUpsert = locations.map((loc) => ({
      ...loc,
      id: loc.id || generateUUID(),
      dealId,
    }));

    await database.transaction(async (tx) => {
      const idsToKeep = dataToUpsert.map((l) => l.id).filter(Boolean);

      // Delete removed locations
      if (idsToKeep.length > 0) {
        await tx
          .delete(drizzleSchema.dealsProposedLocations)
          .where(
            and(
              eq(drizzleSchema.dealsProposedLocations.dealId, dealId),
              notInArray(drizzleSchema.dealsProposedLocations.id, idsToKeep)
            )
          );
      } else {
        await tx
          .delete(drizzleSchema.dealsProposedLocations)
          .where(eq(drizzleSchema.dealsProposedLocations.dealId, dealId));
      }

      // Upsert new/updated locations
      if (dataToUpsert.length > 0) {
        await tx
          .insert(drizzleSchema.dealsProposedLocations)
          .values(dataToUpsert)
          .onConflictDoUpdate({
            target: drizzleSchema.dealsProposedLocations.id,
            set: buildConflictUpdateColumns(
              drizzleSchema.dealsProposedLocations,
              [
                "label",
                "street1",
                "city",
                "state",
                "zipCode",
                // ... other columns
              ]
            ),
          });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getNextDisplayId(brandId: string): Promise<number> {
    const prev = await database.query.deals.findFirst({
      where: eq(drizzleSchema.deals.brandId, brandId),
      orderBy: desc(drizzleSchema.deals.displayId),
      columns: { displayId: true },
    });

    return (prev?.displayId ?? 0) + 1;
  }

  private mapToOverview(data: any): DealOverview {
    return {
      ...data,
      proposedLocations:
        data.dealsProposedLocations?.map((loc: any) => ({
          ...loc,
          vendorTemplate: loc.vendorTemplate ?? null,
        })) ?? [],
      fees:
        data.dealsAgreementsFees?.map((fee: any) => ({
          ...fee,
          name: fee.agreementFee?.name ?? "",
        })) ?? [],
      legalTermsConditions:
        data.dealsLegalTermsConditions?.map((tc: any) => ({
          ...tc,
          name: tc.legalTermsCondition?.name ?? "",
        })) ?? [],
    };
  }
}

export const dealEntity = new DealEntity();
```

## Complete Service Example

```typescript
// {concept}Service.ts
import { database } from "../../db/db.js";
import { dealEntity } from "./dealEntity.js";
import { franchiseeOrgEntity } from "../franchisee/franchiseeOrgEntity.js";
import { locationEntity } from "../locations/locationEntity.js";
import { leadEntity } from "../../contact/lead/leadEntity.js";
import { dealNotifications } from "./dealNotifications.js";
import { dealEvents } from "./dealEvents.js";
import { flagsService } from "../flags/flagsService.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import type { DealUpdates } from "@fsai/sdk";

class DealsService {
  // ═══════════════════════════════════════════════════════════════════════════
  // ORCHESTRATION METHODS
  //
  // Pattern:
  // 1. FETCH - Get data via entity
  // 2. ENFORCE - Call entity predicates, throw if not allowed
  // 3. LOGIC - Feature flags, conditional behavior
  // 4. ORCHESTRATE - Coordinate entities in transaction
  // 5. SIDE EFFECTS - Notifications, events (after transaction)
  // ═══════════════════════════════════════════════════════════════════════════

  async convertDealToFranchisee(
    dealId: string,
    sendInvitation: boolean,
    userId: string
  ): Promise<string> {
    // 1. FETCH
    const deal = await dealEntity.getOverview(dealId);
    if (!deal) {
      throw new NotFoundError("Deal not found");
    }

    // 2. ENFORCE (entity defines rules, service enforces)
    const { allowed, reason } = dealEntity.canConvert(deal);
    if (!allowed) {
      throw new ValidationError(reason);
    }

    // 3. BUSINESS LOGIC
    const portalEnabled = await flagsService.isFranchiseePortalEnabled(
      deal.brandId
    );
    const shouldSendInvite = sendInvitation && portalEnabled;

    // Get lead applicant data for org creation
    const leadApplicant = deal.applicationId
      ? await leadEntity.fetch({ applicationId: deal.applicationId })
      : null;

    // 4. ORCHESTRATE (transaction boundary)
    const franchiseeOrgId = await database.transaction(async () => {
      // Create franchise organization
      const orgId = await franchiseeOrgEntity.create({
        name:
          deal.franchiseeOrgLegalName || `${leadApplicant?.firstName}'s Entity`,
        brandId: deal.brandId,
        address1: deal.franchiseeOrgStreet1,
        city: deal.franchiseeOrgCity,
        state: deal.franchiseeOrgState,
        zipCode: deal.franchiseeOrgZipCode,
      });

      // Convert proposed locations to real locations
      if (dealEntity.canHaveProposedLocations(deal) && deal.proposedLocations) {
        for (const proposed of deal.proposedLocations) {
          await locationEntity.createFromProposed(
            proposed,
            orgId,
            deal.brandId
          );
        }
      }

      // Mark deal as converted
      await dealEntity.markConverted(dealId, orgId);

      // Mark applications as converted
      if (deal.applicationId) {
        await leadEntity.update({
          applicationId: deal.applicationId,
          updates: { converted: true },
        });
      }

      return orgId;
    });

    // 5. SIDE EFFECTS (after transaction succeeds)
    await dealNotifications.onConverted(deal, franchiseeOrgId);
    await dealEvents.emitConverted(deal, franchiseeOrgId);

    if (shouldSendInvite) {
      await this.sendFranchiseeInvitations(
        franchiseeOrgId,
        deal.brandId,
        userId,
        dealId
      );
    }

    return franchiseeOrgId;
  }

  async createDealForApplication(
    applicationId: string,
    brandId: string
  ): Promise<string> {
    // Check if deal already exists
    const existingDealId = await dealEntity.getByApplication(applicationId);
    if (existingDealId) {
      throw new ValidationError("Deal already exists for this application");
    }

    const dealId = await dealEntity.create({
      applicationId,
      brandId,
      visibleToApplicant: false,
    });

    await dealEvents.emitCreated(dealId, brandId, "application");

    return dealId;
  }

  async createDealForFranchiseeOrg(
    franchiseeOrgId: string,
    brandId: string
  ): Promise<string> {
    // Check if deal already exists
    const exists = await dealEntity.existsForFranchiseeOrg(
      franchiseeOrgId,
      brandId
    );
    if (exists) {
      throw new ValidationError(
        "Deal already exists for this franchise entity"
      );
    }

    const dealId = await dealEntity.create({
      franchiseeOrgId,
      brandId,
      visibleToApplicant: false,
    });

    await dealEvents.emitCreated(dealId, brandId, "entity");

    return dealId;
  }

  async updateDeal(dealId: string, updates: DealUpdates): Promise<void> {
    // 1. FETCH
    const deal = await dealEntity.getById(dealId);
    if (!deal) {
      throw new NotFoundError("Deal not found");
    }

    // 2. ENFORCE conditional rules
    if (updates.proposedLocations !== undefined) {
      if (!dealEntity.canHaveProposedLocations(deal)) {
        throw new ValidationError(
          "Entity-based deals cannot have proposed locations"
        );
      }
    }

    if (updates.additionalApplications !== undefined) {
      if (!dealEntity.canHaveAdditionalApplications(deal)) {
        throw new ValidationError(
          "Entity-based deals cannot have additional applications"
        );
      }
    }

    // 3. ORCHESTRATE
    const wasVisible = deal.visibleToApplicant;

    await database.transaction(async () => {
      if (updates.proposedLocations) {
        await dealEntity.setProposedLocations(
          dealId,
          updates.proposedLocations
        );
      }

      if (updates.fees) {
        await dealEntity.setFees(dealId, updates.fees);
      }

      // Update base fields
      const {
        proposedLocations,
        fees,
        additionalApplications,
        ...baseUpdates
      } = updates;
      if (Object.keys(baseUpdates).length > 0) {
        await dealEntity.update(dealId, baseUpdates);
      }
    });

    // 4. SIDE EFFECTS
    if (updates.visibleToApplicant && !wasVisible) {
      const fullDeal = await dealEntity.getOverview(dealId);
      if (fullDeal) {
        await dealNotifications.onMadeVisible(fullDeal);
      }
    }
  }

  async deleteDeal(dealId: string): Promise<void> {
    const deal = await dealEntity.getById(dealId);
    if (!deal) {
      throw new NotFoundError("Deal not found");
    }

    const { allowed, reason } = dealEntity.canDelete(deal);
    if (!allowed) {
      throw new ValidationError(reason);
    }

    await dealEntity.delete(dealId);
    await dealEvents.emitDeleted(dealId, deal.brandId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMPLE DELEGATION
  // For read operations, service can delegate directly to entity
  // ═══════════════════════════════════════════════════════════════════════════

  async getDealOverview(dealId: string) {
    return dealEntity.getOverview(dealId);
  }

  async getDealByApplication(applicationId: string) {
    return dealEntity.getByApplication(applicationId);
  }

  async getBrandDeals(brandId: string) {
    return dealEntity.getByBrand(brandId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async sendFranchiseeInvitations(
    franchiseeOrgId: string,
    brandId: string,
    userId: string,
    dealId: string
  ): Promise<void> {
    try {
      await franchiseeService.invites.inviteAllFranchiseesInOrganization({
        franchiseeOrgId,
        brandId,
        sendingAgentId: userId,
        dealId,
      });
    } catch (error) {
      logger.error("Failed to send franchisee invitations", {
        franchiseeOrgId,
        brandId,
        dealId,
        error,
      });
      // Don't rethrow - invitations are non-critical
    }
  }
}

export const dealsService = new DealsService();
```

## Complete Notifications Example

```typescript
// {concept}Notifications.ts
import { notificationsService } from "../notifications/notificationsService.js";
import { logger } from "../utils/logging.js";
import type { DealOverview } from "@fsai/sdk";

class DealNotifications {
  async onConverted(
    deal: DealOverview,
    franchiseeOrgId: string
  ): Promise<void> {
    const recipients = this.extractRecipients(deal);

    if (!recipients.length) {
      logger.warn("No recipients for deal conversion notification", {
        dealId: deal.id,
        franchiseeOrgId,
      });
      return;
    }

    try {
      const results =
        await notificationsService.franchisees.sendDealConversionNotificationBatch(
          {
            recipients,
            brandId: deal.brandId,
            dealId: deal.id,
            franchiseeOrgId,
          }
        );

      logger.info("Deal conversion notifications sent", {
        dealId: deal.id,
        franchiseeOrgId,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });
    } catch (error) {
      logger.error("Failed to send deal conversion notifications", {
        dealId: deal.id,
        franchiseeOrgId,
        error,
      });
      // Don't rethrow - notifications shouldn't fail the main operation
    }
  }

  async onMadeVisible(deal: DealOverview): Promise<void> {
    if (!deal.applicationId) return;

    try {
      await notificationsService.applicants.triggerNotification({
        applicationId: deal.applicationId,
        type: "deal_available",
      });

      logger.info("Deal visibility notification sent", {
        dealId: deal.id,
        applicationId: deal.applicationId,
      });
    } catch (error) {
      logger.error("Failed to send deal visibility notification", {
        dealId: deal.id,
        error,
      });
    }
  }

  async onStatusChanged(
    deal: DealOverview,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    // Implement status change notifications if needed
    logger.info("Deal status changed", {
      dealId: deal.id,
      oldStatus,
      newStatus,
    });
  }

  private extractRecipients(
    deal: DealOverview
  ): Array<{ email: string; name: string }> {
    return (
      deal.applications
        ?.filter((app) => app.email)
        .map((app) => ({
          email: app.email!,
          name:
            [app.firstName, app.lastName].filter(Boolean).join(" ") ||
            "Team Member",
        })) ?? []
    );
  }
}

export const dealNotifications = new DealNotifications();
```

## Complete Events Example

```typescript
// {concept}Events.ts
import { portalEventsService } from "../analytics/portalEventService.js";
import { generateUUID } from "../utils/crypto.js";
import { logger } from "../utils/logging.js";

class DealEvents {
  async emitConverted(
    deal: DealOverview,
    franchiseeOrgId: string
  ): Promise<void> {
    try {
      await portalEventsService.fireEvent({
        sessionId: generateUUID(),
        brandId: deal.brandId,
        eventType: "franchisee_conversion",
        metadata: {
          dealId: deal.id,
          franchiseeOrgId,
          dealType: deal.applicationId ? "application" : "entity",
        },
      });
    } catch (error) {
      logger.error("Failed to emit deal conversion event", {
        dealId: deal.id,
        error,
      });
    }
  }

  async emitCreated(
    dealId: string,
    brandId: string,
    dealType: "application" | "entity"
  ): Promise<void> {
    try {
      await portalEventsService.fireEvent({
        sessionId: generateUUID(),
        brandId,
        eventType: "deal_created",
        metadata: { dealId, dealType },
      });
    } catch (error) {
      logger.error("Failed to emit deal created event", { dealId, error });
    }
  }

  async emitDeleted(dealId: string, brandId: string): Promise<void> {
    try {
      await portalEventsService.fireEvent({
        sessionId: generateUUID(),
        brandId,
        eventType: "deal_deleted",
        metadata: { dealId },
      });
    } catch (error) {
      logger.error("Failed to emit deal deleted event", { dealId, error });
    }
  }
}

export const dealEvents = new DealEvents();
```
