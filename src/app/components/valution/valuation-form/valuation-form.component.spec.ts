import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValuationFormComponent } from './valuation-form.component';

describe('ValuationFormComponent', () => {
  let component: ValuationFormComponent;
  let fixture: ComponentFixture<ValuationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValuationFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValuationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
