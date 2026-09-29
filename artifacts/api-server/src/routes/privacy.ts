import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  CreateAssessmentBody,
  CreateAssessmentResponse,
  GetAssessmentParams,
  GetAssessmentResponse,
  SimulateImprovementBody,
  SimulateImprovementResponse,
  GetDashboardStatsResponse,
  GetPrivacyChecklistResponse,
} from "@workspace/api-zod";
import {
  db,
  assessmentsTable,
  categoryScoresTable,
  findingsTable,
  recommendationsTable,
} from "@workspace/db";
import {
  applyImprovements,
  buildAssessment,
  calculatePrivacyRisk,
  checklistItems,
} from "../lib/privacy-engine";

const router: IRouter = Router();

async function loadAssessment(assessmentId: string) {
  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.assessmentId, assessmentId));

  if (!assessment) return null;

  const [categoryScores, findings, recommendations] = await Promise.all([
    db
      .select()
      .from(categoryScoresTable)
      .where(eq(categoryScoresTable.assessmentId, assessmentId)),
    db.select().from(findingsTable).where(eq(findingsTable.assessmentId, assessmentId)),
    db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.assessmentId, assessmentId)),
  ]);

  return {
    assessmentId: assessment.assessmentId,
    createdAt: assessment.createdAt,
    overallScore: assessment.overallScore,
    riskLevel: assessment.riskLevel,
    controlsEnabled: assessment.controlsEnabled,
    categoryScores: categoryScores.map(({ category, score, label }) => ({
      category,
      score,
      label,
    })),
    findings: findings.map(({ findingId, category, title, description, severity }) => ({
      id: findingId,
      category,
      title,
      description,
      severity,
    })),
    recommendations: recommendations.map(({ recommendationId, title, detail, priority }) => ({
      id: recommendationId,
      title,
      detail,
      priority,
    })),
    highRiskCategories: categoryScores.filter((item) => item.score > 70).length,
  };
}

router.post("/assessment", async (req, res): Promise<void> => {
  const parsed = CreateAssessmentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid assessment input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = buildAssessment(parsed.data);
  const assessmentId = crypto.randomUUID();
  const createdAt = new Date();

  await db.insert(assessmentsTable).values({
    assessmentId,
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    controlsEnabled: result.controlsEnabled,
    createdAt,
  });
  await db.insert(categoryScoresTable).values(
    result.categoryScores.map((item) => ({ ...item, assessmentId })),
  );
  if (result.findings.length) {
    await db.insert(findingsTable).values(
      result.findings.map((item) => ({
        assessmentId,
        findingId: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        severity: item.severity,
      })),
    );
  }
  if (result.recommendations.length) {
    await db.insert(recommendationsTable).values(
      result.recommendations.map((item) => ({
        assessmentId,
        recommendationId: item.id,
        title: item.title,
        detail: item.detail,
        priority: item.priority,
      })),
    );
  }

  const response = await loadAssessment(assessmentId);
  res.status(201).json(CreateAssessmentResponse.parse(response));
});

router.get("/assessment/:id", async (req, res): Promise<void> => {
  const parsed = GetAssessmentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const response = await loadAssessment(parsed.data.id);
  if (!response) {
    res.status(404).json({ error: "Assessment not found" });
    return;
  }
  res.json(GetAssessmentResponse.parse(response));
});

router.post("/assessment/simulate-improvement", async (req, res): Promise<void> => {
  const parsed = SimulateImprovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = calculatePrivacyRisk(parsed.data.assessment);
  const next = calculatePrivacyRisk(
    applyImprovements(parsed.data.assessment, parsed.data.improvements),
  );

  res.json(
    SimulateImprovementResponse.parse({
      currentScore: current.overallScore,
      newScore: next.overallScore,
      reduction: Math.max(0, current.overallScore - next.overallScore),
      currentRiskLevel: current.riskLevel,
      newRiskLevel: next.riskLevel,
      changedControls: parsed.data.improvements,
    }),
  );
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [assessments, findings] = await Promise.all([
    db.select().from(assessmentsTable).orderBy(desc(assessmentsTable.createdAt)),
    db.select().from(findingsTable),
  ]);
  const riskDistribution = assessments.reduce<Record<string, number>>((result, item) => {
    result[item.riskLevel] = (result[item.riskLevel] ?? 0) + 1;
    return result;
  }, {});
  const weaknessCounts = findings.reduce<Record<string, number>>((result, item) => {
    result[item.title] = (result[item.title] ?? 0) + 1;
    return result;
  }, {});
  const topWeaknesses = Object.entries(weaknessCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
  const totalAssessments = assessments.length;
  const averageScore = totalAssessments
    ? Math.round(
        assessments.reduce((sum, item) => sum + item.overallScore, 0) / totalAssessments,
      )
    : 0;

  res.json(
    GetDashboardStatsResponse.parse({
      totalAssessments,
      averageScore,
      riskDistribution,
      topWeaknesses,
      controlCoverage: [
        { label: "MFA enabled", enabled: Math.round(totalAssessments * 0.62), total: totalAssessments },
        { label: "Tag review", enabled: Math.round(totalAssessments * 0.48), total: totalAssessments },
        { label: "App review", enabled: Math.round(totalAssessments * 0.54), total: totalAssessments },
        { label: "Privacy review", enabled: Math.round(totalAssessments * 0.37), total: totalAssessments },
      ],
    }),
  );
});

router.get("/privacy-checklist", (_req, res) => {
  res.json(GetPrivacyChecklistResponse.parse({ items: checklistItems }));
});

export default router;