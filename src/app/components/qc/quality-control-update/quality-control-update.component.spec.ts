import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualityControlUpdateComponent } from './quality-control-update.component';

describe('QualityControlUpdateComponent', () => {
  let component: QualityControlUpdateComponent;
  let fixture: ComponentFixture<QualityControlUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualityControlUpdateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QualityControlUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
