import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-viz-wrapper">
      <div class="table-viz-container">
        <svg [attr.viewBox]="'0 0 ' + viewBoxSize + ' ' + viewBoxSize" 
             preserveAspectRatio="xMidYMid meet"
             class="table-svg">
          
          <!-- Table (full circle) -->
          <circle [attr.cx]="centerPoint" [attr.cy]="centerPoint" [attr.r]="tableRadius" 
                  fill="none" [attr.stroke]="tableColor" [attr.stroke-width]="tableStrokeWidth"/>
          <circle [attr.cx]="centerPoint" [attr.cy]="centerPoint" [attr.r]="tableRadius * 0.85" 
                  fill="none" stroke="#888" [attr.stroke-width]="tableStrokeWidth * 0.4"/>
          
          <!-- Chairs arranged around the table -->
          @for (chair of chairs; track $index) {
            <g [attr.transform]="'translate(' + chair.x + ',' + chair.y + ') rotate(' + chair.rotation + ') scale(' + chairScale + ')'">
              <!-- Chair seat (circle) -->
              <circle cy="8" r="26" fill="none" [attr.stroke]="chairColor" stroke-width="5"/>
              <!-- Chair back (main arc) -->
              <path d="M-24 -6 A 28 20 0 0 1 24 -6" fill="none" [attr.stroke]="chairColor" stroke-width="5" stroke-linecap="round"/>
              <!-- Chair back details -->
              <path d="M-18 -11 A 22 14 0 0 1 18 -11" fill="none" [attr.stroke]="chairColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M-13 -16 A 18 10 0 0 1 13 -16" fill="none" [attr.stroke]="chairColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M-8 -20 A 12 6 0 0 1 8 -20" fill="none" [attr.stroke]="chairColor" stroke-width="2" stroke-linecap="round"/>
              <!-- Chair legs -->
              <path d="M-17 32 L -19 38" [attr.stroke]="chairColor" stroke-width="4.5" stroke-linecap="round"/>
              <path d="M17 32 L 19 38" [attr.stroke]="chairColor" stroke-width="4.5" stroke-linecap="round"/>
            </g>
          }
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .table-viz-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 8px 0;
    }

    .table-viz-container {
      width: 100%;
      max-width: 320px;
      aspect-ratio: 1 / 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .table-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class TableVisualizationComponent implements OnChanges {
  @Input() capacity: number = 2;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() tableColor: string = '#333';
  @Input() chairColor: string = '#333';

  // Fixed viewBox dimensions for consistent scaling
  viewBoxSize = 400;
  centerPoint = 200;
  tableRadius = 70;
  tableStrokeWidth = 8;
  chairScale = 0.45;
  chairs: { x: number; y: number; rotation: number }[] = [];

  ngOnChanges(changes: SimpleChanges) {
    this.calculateDimensions();
    this.generateChairs();
  }

  private calculateDimensions() {
    // Adjust table and chair sizes based on capacity
    // Keep everything within the viewBox with padding
    const maxChairRadius = 160; // Maximum distance from center to chair
    const minPadding = 40; // Padding from viewBox edge
    
    // Scale based on size input
    const sizeConfig = {
      small: { tableRadius: 60, chairScale: 0.38, strokeWidth: 6 },
      medium: { tableRadius: 70, chairScale: 0.45, strokeWidth: 8 },
      large: { tableRadius: 85, chairScale: 0.52, strokeWidth: 10 }
    };
    
    const config = sizeConfig[this.size];
    this.tableRadius = config.tableRadius;
    this.chairScale = config.chairScale;
    this.tableStrokeWidth = config.strokeWidth;
    
    // For larger parties, slightly reduce chair scale to fit
    if (this.capacity > 8) {
      this.chairScale *= 0.85;
    } else if (this.capacity > 6) {
      this.chairScale *= 0.92;
    }
  }

  private generateChairs() {
    this.chairs = [];
    
    // Calculate chair placement radius
    // Chair SVG is roughly 80 units tall when scaled, so account for that
    const scaledChairSize = 50 * this.chairScale;
    const chairPlacementRadius = this.tableRadius + scaledChairSize + 25;
    
    // Ensure chairs stay within viewBox (with padding)
    const maxRadius = (this.viewBoxSize / 2) - 45;
    const safeRadius = Math.min(chairPlacementRadius, maxRadius);
    
    // Place chairs equally spaced around the full circle
    // angle = (360 / N) * i
    // x = cx + R * cos(angle)
    // y = cy + R * sin(angle)
    for (let i = 0; i < this.capacity; i++) {
      const angleDeg = (360 / this.capacity) * i - 90; // Start from top (-90°)
      const angleRad = (angleDeg * Math.PI) / 180;
      
      const x = this.centerPoint + safeRadius * Math.cos(angleRad);
      const y = this.centerPoint + safeRadius * Math.sin(angleRad);
      
      // Rotate chair to face the table center
      const rotation = angleDeg + 90;
      
      this.chairs.push({ x, y, rotation });
    }
  }
}
