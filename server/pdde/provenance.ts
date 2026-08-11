import type { SchoolExtraction } from "./types";

export type EvidenceArtifactReferences = {
  rawHtmlKey: string;
  rawHtmlUrl: string;
  normalizedJsonKey: string;
  normalizedJsonUrl: string;
};

/** Associa artefatos imutáveis da consulta a todos os campos extraídos daquela resposta. */
export function attachEvidenceArtifacts(record: SchoolExtraction, artifact: EvidenceArtifactReferences): SchoolExtraction {
  record.fieldProvenance.forEach(provenance => {
    provenance.artifact = artifact;
  });
  return record;
}
