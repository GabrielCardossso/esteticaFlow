import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Vazio } from '@/components/ui/vazio';

export default function NaoEncontrado() {
  return (
    <Cartao>
      <Vazio
        icone={FileQuestion}
        titulo="Página não encontrada"
        descricao="O endereço acessado não existe ou o registro foi removido."
        acao={
          <Botao comoFilho variante="acento">
            <Link href="/painel">Voltar ao painel</Link>
          </Botao>
        }
      />
    </Cartao>
  );
}
