
<?php

return [
    // Se comparan en minúsculas y sin tildes, palabra por palabra
    'palabras_ofensivas' => [
        'idiota', 'estupido', 'imbecil', 'pelotudo', 'boludo', 'tarado',
        'mierda', 'asqueroso', 'cretino', 'sorete', 'mugroso', 'tonto',

        // Lunfardo argentino. Base: dataset ARG de github.com/jfreddypuentes/spanlp, sin las palabras
        // que pueden aparecer en un texto normal (hoyo, rata, bulto, pelotas, coger), más otras comunes.
        // Van en singular: el filtro también atrapa el plural. Solo palabras sueltas.
        'forro', 'puta', 'puto', 'putear', 'hijoputa', 'hdp', 'lpm',
        'concha', 'conchudo', 'conchuda', 'cajeta', 'choto', 'culo', 'culiado', 'orto', 'ortiva',
        'ojete', 'cuca', 'pija', 'pijotero', 'chupapija', 'pajero', 'tragasable',
        'pendejo', 'garca', 'mogolico', 'mongolico', 'retardado', 'cagon', 'cagada',
        'trolo', 'marica', 'maricon', 'verga', 'pelotudez', 'boludez', 'gilada',
    ],

    'texto_reemplazo' => 'comentario ofensivo',
];