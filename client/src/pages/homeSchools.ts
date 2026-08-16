export type HomeSchool = {
  inep: string;
  sme: string;
  schoolName: string | null;
  status: "success" | "failed";
  programsJson: string[];
  basicAccountStatus: "informada" | "nao-informada" | null;
  basicAccount?: { agency: string | null; account: string | null } | null;
  firstInstallmentPaid: boolean | null;
  secondInstallmentExpected: boolean | null;
};

export type HomeSchoolFilter = "all" | "account-found" | "account-not-shown" | "first-installment-paid" | "second-installment-expected";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function filterHomeSchools(schools: HomeSchool[], query: string, filter: HomeSchoolFilter) {
  const term = normalized(query.trim());
  return schools.filter(school => {
    const matchesTerm = !term || [school.schoolName ?? "", school.inep, school.sme, ...(school.programsJson ?? [])]
      .some(value => normalized(value).includes(term));
    if (!matchesTerm) return false;
    if (filter === "account-found") return school.basicAccountStatus === "informada";
    if (filter === "account-not-shown") return school.basicAccountStatus === "nao-informada";
    if (filter === "first-installment-paid") return school.firstInstallmentPaid === true;
    if (filter === "second-installment-expected") return school.secondInstallmentExpected === true;
    return true;
  });
}

export function accountStatusLabel(status: HomeSchool["basicAccountStatus"]) {
  if (status === "informada") return "Conta do PDDE encontrada";
  if (status === "nao-informada") return "Conta do PDDE não exibida";
  return "Sem retorno de conta";
}
