type LogoProps = {
  class?: string;
  title?: string;
};

export function LeetLensLogo(props: LogoProps) {
  return <svg class={props.class} viewBox="0 0 64 64" fill="none" role={props.title ? 'img' : undefined} aria-hidden={props.title ? undefined : true}>
    {props.title && <title>{props.title}</title>}
    <rect x="4" y="4" width="56" height="56" rx="15" fill="#1F2937" />
    <circle cx="29" cy="29" r="15" stroke="#3DBD7D" stroke-width="5" />
    <path d="M40 40L52 52" stroke="#3DBD7D" stroke-width="6" stroke-linecap="round" />
    <path d="M22 29L27 34L36 24" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>;
}
