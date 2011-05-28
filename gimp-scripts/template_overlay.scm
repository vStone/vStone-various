(define (script-fu-template-overlay img drawable)

    
    ; Do magic here.
        ;(overlay (car (gimp-layer-new img (car (gimp-image-width img)) (car (gimp-image-height img)) RGB-IMAGE "Template Overlay" 30 NORMAL-MODE)))
 (let* (
    (color '(0 0 255))
    (border 0)
    (overlay 0))
    (set! overlay (car (gimp-layer-new img (car (gimp-image-width img)) (car (gimp-image-height img)) RGBA-IMAGE "Template Overlay" 30 NORMAL-MODE)))
    (set! border (car (gimp-layer-new img (car (gimp-image-width img)) (car (gimp-image-height img)) RGBA-IMAGE "Template Overlay Border" 100 NORMAL-MODE)))
    
    
    (gimp-image-undo-group-start img)
    (gimp-context-set-foreground color)
    (gimp-image-add-layer img overlay -1)
    (gimp-image-add-layer img border -1)
    (gimp-image-set-active-layer img overlay)
    (gimp-edit-bucket-fill overlay FG-BUCKET-FILL NORMAL-MODE 100 100 FALSE 0 0)

    (gimp-image-set-active-layer img border)
        ; create a border from selection.
    (gimp-selection-border img 2)

        ; fill the selection with foreground color
    (gimp-edit-bucket-fill border FG-BUCKET-FILL NORMAL-MODE 100 100 FALSE 0 0)
    (gimp-image-merge-down img border EXPAND-AS-NECESSARY) 
    ; create a new text with a # in it and place it in a new layer.
    ; ends let *
    ; Complete the undo group
    )
    (gimp-image-undo-group-end img)

    ;Flush output
    (gimp-displays-flush))

(script-fu-register "script-fu-template-overlay"
		    "Template Overlay"
		    "Create a new template overlay on the selection"
        "Jan Vansteenkiste <jan@vstone.eu>"
		    "Jan Vansteenkiste"
		    "2011-05-28"
		    "RGB*, GRAY*"
		    SF-IMAGE "Input Image" 0
		    SF-DRAWABLE "Input Drawable" 0)
(script-fu-menu-register "script-fu-template-overlay"
			 "<Image>/Script-Fu/vStone")
