export function calculerAge(dateNaissance: string, aujourdHui: Date = new Date()): number {
  const naissance = new Date(dateNaissance);
  let age = aujourdHui.getFullYear() - naissance.getFullYear();

  const anniversaireDepasse =
    aujourdHui.getMonth() > naissance.getMonth() ||
    (aujourdHui.getMonth() === naissance.getMonth() && aujourdHui.getDate() >= naissance.getDate());

  if (!anniversaireDepasse) {
    age -= 1;
  }

  return age;
}
