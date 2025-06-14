import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleImageUploadComponent } from './vehicle-image-upload.component';

describe('VehicleImageUploadComponent', () => {
  let component: VehicleImageUploadComponent;
  let fixture: ComponentFixture<VehicleImageUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VehicleImageUploadComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleImageUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
