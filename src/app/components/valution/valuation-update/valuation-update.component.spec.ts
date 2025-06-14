import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValuationUpdateComponent } from './valuation-update.component';

describe('ValuationUpdateComponent', () => {
  let component: ValuationUpdateComponent;
  let fixture: ComponentFixture<ValuationUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValuationUpdateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValuationUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
