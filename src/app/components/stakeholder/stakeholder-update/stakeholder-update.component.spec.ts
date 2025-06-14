import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholderUpdateComponent } from './stakeholder-update.component';

describe('StakeholderUpdateComponent', () => {
  let component: StakeholderUpdateComponent;
  let fixture: ComponentFixture<StakeholderUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StakeholderUpdateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StakeholderUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
