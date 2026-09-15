import type {MetadataRoute} from 'next';

// The authenticated app, invitations and client portal are private surfaces.
// Only the separate public landing is intended for organic discovery.
export default function robots():MetadataRoute.Robots{
 return {rules:{userAgent:'*',disallow:'/'}};
}
