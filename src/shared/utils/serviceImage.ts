export const getServiceImage = (srv: { id?: string; image?: string; category?: string } | null | undefined): string => {
  if (srv?.image && typeof srv.image === 'string' && srv.image.trim().length > 5) {
    return srv.image;
  }
  const id = srv?.id || '';
  if (id.includes('relajante')) return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800';
  if (id.includes('descontracturante') || id.includes('tension')) return 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800';
  if (id.includes('deportivo')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800';
  if (id.includes('profundo')) return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800';
  if (id.includes('prenatal')) return 'https://images.unsplash.com/photo-1512290900672-8a9d18b39058?auto=format&fit=crop&q=80&w=800';
  if (id.includes('pareja')) return 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&q=80&w=800';
  return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800';
};
