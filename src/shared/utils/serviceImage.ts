import imgSportsCalf from '../../assets/images/sports_massage_essenya_1789423135431.jpg';
import imgDeepTissue from '../../assets/images/deep_tissue_essenya_1789423125038.jpg';
import imgPrenatal from '../../assets/images/prenatal_massage_essenya_1789423145499.jpg';
import imgCouples from '../../assets/images/couples_massage_essenya_1789423155702.jpg';
import imgRelaxing from '../../assets/images/regenerated_image_1790367912901.png';
import imgTension from '../../assets/images/tension_release_essenya_1789423167792.jpg';
import imgFourHands from '../../assets/images/four_hands_massage_1785522559896.jpg';

export const STATIC_SERVICE_IMAGES: Record<string, string> = {
  'SRB-relajante': imgRelaxing,
  'srv-relajante': imgRelaxing,
  'srv-descontracturante': imgTension,
  'srv-deportivo': imgSportsCalf,
  'srv-tejido-profundo': imgDeepTissue,
  'srv-prenatal': imgPrenatal,
  'srv-pareja': imgCouples,
  'srv-cuatro-manos': imgFourHands,
};

export const getStaticServiceImageFallback = (idOrName?: string): string => {
  const query = (idOrName || '').toLowerCase();
  if (query.includes('descontract') || query.includes('tension') || query.includes('nudos')) return imgTension;
  if (query.includes('deport') || query.includes('sport') || query.includes('atlet')) return imgSportsCalf;
  if (query.includes('profund') || query.includes('deep') || query.includes('tejido')) return imgDeepTissue;
  if (query.includes('prenat') || query.includes('embaraz') || query.includes('gestant')) return imgPrenatal;
  if (query.includes('parej') || query.includes('duo') || query.includes('couple') || query.includes('dos')) return imgCouples;
  if (query.includes('cuatro') || query.includes('four') || query.includes('manos')) return imgFourHands;
  if (query.includes('relaj') || query.includes('relax') || query.includes('srb')) return imgRelaxing;
  return imgRelaxing;
};

export const getServiceImage = (
  srv: { id?: string; name?: string; nombre?: string; image?: string; category?: string } | string | null | undefined
): string => {
  if (!srv) return imgRelaxing;

  if (typeof srv === 'string') {
    const trimmed = srv.trim();
    const query = trimmed.toLowerCase();

    if (STATIC_SERVICE_IMAGES[trimmed]) {
      return STATIC_SERVICE_IMAGES[trimmed];
    }
    if (
      (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
      !trimmed.includes('photo-1512290900672')
    ) {
      return trimmed;
    }
    if (trimmed.startsWith('/assets') || trimmed.startsWith('data:') || trimmed.startsWith('/@fs')) {
      return trimmed;
    }
    return getStaticServiceImageFallback(query);
  }

  const id = (srv.id || '').trim();
  const name = (srv.name || srv.nombre || '').trim().toLowerCase();

  // 1. Direct ID match in static registry
  if (id && STATIC_SERVICE_IMAGES[id]) {
    return STATIC_SERVICE_IMAGES[id];
  }

  // 2. Specific keyword matching on name or ID
  if (name.includes('descontract') || id.includes('descontract') || name.includes('tension')) return imgTension;
  if (name.includes('deport') || id.includes('deport') || name.includes('sport')) return imgSportsCalf;
  if (name.includes('profund') || id.includes('profund') || name.includes('deep') || name.includes('tejido')) return imgDeepTissue;
  if (name.includes('prenat') || id.includes('prenat') || name.includes('embaraz')) return imgPrenatal;
  if (name.includes('parej') || id.includes('parej') || name.includes('duo') || name.includes('couple')) return imgCouples;
  if (name.includes('cuatro') || id.includes('cuatro') || name.includes('four')) return imgFourHands;
  if (name.includes('relaj') || id.includes('relaj') || id.includes('srb')) return imgRelaxing;

  // 3. Valid image property from object
  if (
    srv.image &&
    typeof srv.image === 'string' &&
    srv.image.trim().length > 5 &&
    !srv.image.includes('photo-1512290900672')
  ) {
    return srv.image.trim();
  }

  // 4. Fallback search
  return getStaticServiceImageFallback(srv.name || srv.nombre || srv.category || id);
};
