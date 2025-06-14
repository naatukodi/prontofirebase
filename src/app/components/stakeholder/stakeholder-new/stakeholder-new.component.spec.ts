import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholderNewComponent } from './stakeholder-new.component';

describe('StakeholderNewComponent', () => {
  let component: StakeholderNewComponent;
  let fixture: ComponentFixture<StakeholderNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StakeholderNewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StakeholderNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
