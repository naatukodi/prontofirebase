import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValuationVehicleDetailsComponent } from './valuation-vehicle-details.component';

describe('ValuationVehicleDetailsComponent', () => {
  let component: ValuationVehicleDetailsComponent;
  let fixture: ComponentFixture<ValuationVehicleDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValuationVehicleDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValuationVehicleDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
