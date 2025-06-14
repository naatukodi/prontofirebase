import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowButtonsComponent } from './workflow-buttons.component';

describe('WorkflowButtonsComponent', () => {
  let component: WorkflowButtonsComponent;
  let fixture: ComponentFixture<WorkflowButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorkflowButtonsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkflowButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
