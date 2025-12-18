from manim import *

class WebLogo(ThreeDScene):
    def construct(self):
        # 1. The "Web" Sphere (Wireframe Globe)
        # Using a UV sphere with low resolution to make it look like a network/grid
        sphere = Surface(
            lambda u, v: np.array([
                1.5 * np.cos(u) * np.cos(v),
                1.5 * np.cos(u) * np.sin(v),
                1.5 * np.sin(u)
            ]), v_range=[0, TAU], u_range=[-PI/2, PI/2],
            resolution=(15, 15),
            checkerboard_colors=None
        )
        sphere.set_style(fill_opacity=0, stroke_color=BLUE_E, stroke_width=2)
        
        # Add some glowing dots at intersections to look like nodes
        # (Simplified as just the wireframe for cleaner look)

        # 2. Orientation
        self.set_camera_orientation(phi=75 * DEGREES, theta=30 * DEGREES)
        sphere.rotate(20*DEGREES, axis=RIGHT)
        sphere.rotate(10*DEGREES, axis=UP)

        # 3. Text
        title = MarkupText(
            f'<span foreground="{BLUE}">Manim</span> <span foreground="{PURPLE}">Web</span>',
            font_size=80
        ).move_to(DOWN * 2.5)
        
        subtitle = Text("RENDERER", font_size=40, weight=BOLD).next_to(title, DOWN, buff=0.2)
        
        # Orient text to face camera in 3D scene implies we usually just add it as fixed_in_frame
        # But here we are in 3D. Let's try adding it to the scene but rotated, 
        # or easier: use a 2D scene, but Sphere requires 3D. 
        # Solution: explicit fixed_in_frame_mobjects
        self.add_fixed_in_frame_mobjects(title, subtitle)
        title.move_to(DOWN * 2.0)
        subtitle.next_to(title, DOWN, buff=0.1)

        self.add(sphere)
