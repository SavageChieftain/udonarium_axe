import { CLASS_SINGLETON_PROVIDERS } from '@axe/composition/class-provider';

/**
 * Providers shared by the specs.
 * Used as TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] }).
 */
export const TEST_PROVIDERS = [...CLASS_SINGLETON_PROVIDERS];
