import { describe, expect, it } from 'vitest';
import { isPersonalEmail } from '../../src/signup';

describe('avviso email personale', () => {
  it('riconosce i provider personali più comuni', () => {
    for (const e of ['a@gmail.com', 'a@hotmail.it', 'a@libero.it', 'a@yahoo.it', 'a@outlook.com', 'a@icloud.com', 'a@yahoo.co.uk'])
      expect(isPersonalEmail(e), e).toBe(true);
  });
  it('non segnala le email aziendali', () => {
    for (const e of ['a@acme.it', 'a@deploiable.com', 'a@comune.roma.it', 'a@gmailing.it'])
      expect(isPersonalEmail(e), e).toBe(false);
  });
});
