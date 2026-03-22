import { CLASS_SINGLETON_PROVIDERS } from 'service/class-provider';

/**
 * テスト用のプロバイダ配列。
 * TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] }) で使用する。
 */
export const TEST_PROVIDERS = [...CLASS_SINGLETON_PROVIDERS];
