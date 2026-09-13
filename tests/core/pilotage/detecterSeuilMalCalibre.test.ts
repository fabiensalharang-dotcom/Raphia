import { detecterSeuilMalCalibre } from '../../../core/pilotage/detecterSeuilMalCalibre';

describe('detecterSeuilMalCalibre', () => {
  it('détecte un seuil trop haut : 7 jours sur 7 chaque semaine pendant 3 semaines', () => {
    const semaines = [{ daysThresholdMet: 7 }, { daysThresholdMet: 7 }, { daysThresholdMet: 7 }];
    expect(detecterSeuilMalCalibre(semaines)).toBe('haut');
  });

  it('ne détecte rien si une seule semaine sur trois est en dessous de 7', () => {
    const semaines = [{ daysThresholdMet: 7 }, { daysThresholdMet: 6 }, { daysThresholdMet: 7 }];
    expect(detecterSeuilMalCalibre(semaines)).toBeNull();
  });

  it('détecte un seuil trop bas : moins de 2 fois par semaine pendant 3 semaines', () => {
    const semaines = [{ daysThresholdMet: 1 }, { daysThresholdMet: 0 }, { daysThresholdMet: 1 }];
    expect(detecterSeuilMalCalibre(semaines)).toBe('bas');
  });

  it('ne détecte rien si une semaine atteint déjà 2', () => {
    const semaines = [{ daysThresholdMet: 1 }, { daysThresholdMet: 2 }, { daysThresholdMet: 0 }];
    expect(detecterSeuilMalCalibre(semaines)).toBeNull();
  });

  it('semaine incomplète (moins de 3 semaines d’historique) : ne tranche pas', () => {
    expect(detecterSeuilMalCalibre([{ daysThresholdMet: 7 }, { daysThresholdMet: 7 }])).toBeNull();
  });
});
