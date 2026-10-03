import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoPlayerModalComponent } from './video-player-modal.component';

describe('VideoPlayerModalComponent', () => {
  let component: VideoPlayerModalComponent;
  let fixture: ComponentFixture<VideoPlayerModalComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoPlayerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
