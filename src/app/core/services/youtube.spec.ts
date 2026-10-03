import { TestBed } from '@angular/core/testing';
import { Youtube } from './youtube';

describe('Youtube', () => {
  let service: Youtube;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Youtube);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
