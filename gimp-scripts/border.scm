(define (script-fu-border-selection img drawable)

    
    (let* (
       (border 0)
       (color '(0 170 0)))
    (set! border (car (gimp-layer-new img (car (gimp-image-width img)) (car (gimp-image-height img)) RGBA-IMAGE "Template Overlay Border" 100 NORMAL-MODE)))
    ; Do magic here.
    ; create a border from selection.

    (gimp-image-undo-group-start img)
    (gimp-context-set-foreground color)
    (gimp-image-add-layer img border -1)
    (gimp-image-set-active-layer img border)
    
    (gimp-selection-border img 2)

    ; fill the selection with foreground color
    (gimp-edit-bucket-fill border FG-BUCKET-FILL NORMAL-MODE 100 100 FALSE 0 0)
    
    ; create a new text with a # in it and place it in a new layer.
	  )
    ; Complete the undo group
    (gimp-image-undo-group-end img)

    ;Flush output
    (gimp-displays-flush))

(script-fu-register "script-fu-border-selection"
		    "Border Fill"
		    "Put a border around current selection"
  	            "Jan Vansteenkiste <jan@vstone.eu>"
		    "Jan Vansteenkiste"
		    "2011-05-28"
		    "RGB*, GRAY*"
		    SF-IMAGE "Input Image" 0
		    SF-DRAWABLE "Input Drawable" 0)
(script-fu-menu-register "script-fu-border-selection"
			 "<Image>/Script-Fu/vStone")
