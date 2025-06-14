import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedModule } from './shared.module';

describe('SharedModule', () => {
  let component: SharedModule;
  let fixture: ComponentFixture<SharedModule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedModule);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
