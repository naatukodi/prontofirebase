import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionUpdateComponent } from './inspection-update.component';

describe('InspectionUpdateComponent', () => {
  let component: InspectionUpdateComponent;
  let fixture: ComponentFixture<InspectionUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InspectionUpdateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
